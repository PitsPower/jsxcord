import type { InteractionResponse, Message } from 'discord.js'
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js'
import { type ReactNode, Suspense } from 'react'
import * as container from './container'
import { createMessageOptions, hydrateMessages } from './message'
import Renderer from './renderer'

function sync<Args extends unknown[]>(
  func: (...args: Args) => Promise<void>,
): (...args: Args) => void {
  return (...args) => void func(...args).catch(console.error)
}

export * from './component'

export function bot(
  commands: Record<string, ReactNode>,
): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] })

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

    const node = commands[interaction.commandName]
    const root = container.create(client)
    const messages: Message[] = []

    Renderer.render(
      <Suspense fallback={<></>}>{node}</Suspense>,
      root,
    )

    const messageOptions = createMessageOptions(root)
    for (const options of messageOptions) {
      const response = await interaction.reply({
        ...options,
        flags: [],
      })
      messages.push(await response.fetch())
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
