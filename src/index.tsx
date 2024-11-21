import type { ChatInputCommandInteraction, Message } from 'discord.js'
import { createAudioPlayer, joinVoiceChannel } from '@discordjs/voice'
import { Client, GatewayIntentBits, GuildMember, REST, Routes, SlashCommandBuilder } from 'discord.js'
import { createContext, type ReactNode, Suspense } from 'react'
import { Mixer } from './audio'
import * as container from './container'
import { createMessageOptions, hydrateMessages } from './message'
import Renderer from './renderer'

export * from './component'

function sync<Args extends unknown[]>(
  func: (...args: Args) => Promise<void>,
): (...args: Args) => void {
  return (...args) => void func(...args).catch(console.error)
}

interface AudioContextData {
  mixer: Mixer
  joinVc: () => void
}

export const AudioContext = createContext<AudioContextData | null>(null)

export function bot(
  commands: Record<string, ReactNode | ((interaction: ChatInputCommandInteraction) => Promise<void>)>,
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
        body: Object.keys(commands).map(name =>
          new SlashCommandBuilder()
            .setName(name)
            .setDescription('No description')
            .toJSON(),
        ),
      },
    )
  })

  client.on('interactionCreate', sync(async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return
    }

    const nodeOrFunc = commands[interaction.commandName]

    if (typeof nodeOrFunc === 'function') {
      await nodeOrFunc(interaction)
      return
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

    Renderer.render(
      <Suspense fallback={<></>}>
        <AudioContext.Provider value={audioContext}>
          {nodeOrFunc}
        </AudioContext.Provider>
      </Suspense>,
      root,
    )

    const messageOptions = createMessageOptions(root)
    for (let i = 0; i < messageOptions.length; i++) {
      const options = messageOptions[i]

      if (i === 0) {
        const response = await interaction.reply({
          ...options,
          flags: [],
        })
        messages.push(await response.fetch())
      }
      else {
        if (interaction.channel === null || !interaction.channel.isSendable()) {
          return
        }

        messages.push(await interaction.channel.send({
          ...options,
          flags: [],
        }))
      }
    }

    hydrateMessages(messages, root)

    root.onChange = async () => {
      const newOptions = createMessageOptions(root)

      newOptions.forEach((options, i) => {
        if (messages[i] !== undefined && JSON.stringify(messageOptions[i]) !== JSON.stringify(options)) {
          messageOptions[i] = options
          void messages[i].edit({
            ...options,
            flags: [],
          })
        }
      })

      for (let i = messageOptions.length; i < newOptions.length; i++) {
        if (interaction.channel?.isSendable()) {
          messages.push(await interaction.channel.send(newOptions[i]))
        }
      }
    }
  }))

  return client
}
