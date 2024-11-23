/**
 * @packageDocumentation
 * @categoryDescription Hooks
 * Various JSXcord-specific React hooks.
 */

import type { ChatInputCommandInteraction, Interaction, Message, MessageCreateOptions } from 'discord.js'

import { createAudioPlayer, joinVoiceChannel } from '@discordjs/voice'
import { Client, GatewayIntentBits, GuildMember, REST, Routes, SlashCommandBuilder } from 'discord.js'
import { createContext, type ReactNode, Suspense } from 'react'
import { z } from 'zod'
import { Mixer } from './audio'
import * as container from './container'
import { createMessageOptions, hydrateMessages, isMessageOptionsEmpty } from './message'
import Renderer from './renderer'
import { sync } from './util'

import { buildZodType, getOptionsAsObject, type ZodCommand } from './zod'

export * from './component'
export * from './hook'
export * from './shared'

interface AudioContextData {
  mixer: Mixer
  joinVc: () => void
}

/** @internal */
export const AudioContext = createContext<AudioContextData | null>(null)
/** @internal */
export const InteractionContext = createContext<Interaction | null>(null)

export function bot(
  commands: Record<
    string,
    | ReactNode
    | ((interaction: ChatInputCommandInteraction) => Promise<void>)
    | ZodCommand<z.ZodRawShape, true>
  >,
): Client {
  const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ] })

  client.on('ready', (client) => {
    const rest = new REST().setToken(client.token)

    void rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: Object.entries(commands).map(([name, command]) => {
          const builder = new SlashCommandBuilder()
            .setName(name)
            .setDescription('No description')

          if (command instanceof z.ZodObject) {
            for (const [key, value] of Object.entries(command.shape as object)) {
              buildZodType(builder, key, value)
            }
          }

          return builder.toJSON()
        },
        ),
      },
    )
  })

  client.on('interactionCreate', sync(async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return
    }

    let command = commands[interaction.commandName]

    if (typeof command === 'function') {
      await command(interaction)
      return
    }

    if (command instanceof z.ZodObject) {
      const options = command.parse(getOptionsAsObject(interaction.options))
      command = command._componentFunc(options)
    }

    const root = container.create(client)
    const messages: Message[] = []

    const mixer = new Mixer()
    let hasJoinedVc = false

    const audioContext: AudioContextData = {
      mixer,

      joinVc: () => {
        if (hasJoinedVc) {
          return
        }

        const member = interaction.member
        if (!(member instanceof GuildMember)) {
          return
        }

        const voiceChannel = member.voice.channel
        if (voiceChannel === null || !voiceChannel.joinable) {
          return
        }

        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guildId,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })

        const player = createAudioPlayer()
        connection.subscribe(player)

        player.play(mixer.getAudioResource())

        hasJoinedVc = true
      },
    }

    const messageOptions: MessageCreateOptions[] = []

    root.onChange = async () => {
      const newOptions = createMessageOptions(root)

      for (let i = 0; i < newOptions.length; i++) {
        const options = newOptions[i]

        if (
          JSON.stringify(messageOptions[i]) === JSON.stringify(options)
          || isMessageOptionsEmpty(options)
        ) {
          continue
        }

        messageOptions[i] = options

        if (messages[i] !== undefined) {
          void messages[i].edit({
            ...options,
            flags: [],
          })
        }
        else if (i === 0) {
          if (interaction.deferred) {
            messages[i] = await interaction.editReply(options)
          }
          else if (!isMessageOptionsEmpty(options)) {
            const response = await interaction.reply({
              ...options,
              flags: [],
            })
            messages[i] = await response.fetch()
          }
          else {
            await interaction.deferReply()
          }
        }
      }

      for (let i = messageOptions.length; i < newOptions.length; i++) {
        if (interaction.channel?.isSendable() && !isMessageOptionsEmpty(newOptions[i])) {
          messages.push(await interaction.channel.send(newOptions[i]))
        }
      }

      hydrateMessages(messages, root)
    }

    Renderer.render(
      <Suspense fallback={<></>}>
        <AudioContext.Provider value={audioContext}>
          <InteractionContext.Provider value={interaction}>
            {command}
          </InteractionContext.Provider>
        </AudioContext.Provider>
      </Suspense>,
      root,
    )
  }))

  return client
}
