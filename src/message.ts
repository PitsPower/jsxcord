import type { Container } from './container'
import { ComponentType, InteractionResponse, type Message, type MessageCreateOptions } from 'discord.js'
import { ButtonInstance, MarkdownInstance, PollInstance, TextInstance } from './instance'

const MESSAGE_PARTS = [
  [MarkdownInstance, TextInstance],
  [PollInstance],
  [ButtonInstance],
]

export function createMessageOptions(container: Container): MessageCreateOptions[] {
  let currentMessageStage = 0
  let currentOptions: MessageCreateOptions = {
    content: '',
  }
  const result = [currentOptions]

  for (const child of container.children) {
    if (child.isHidden) {
      continue
    }

    while (true) {
      const possibleInstances = MESSAGE_PARTS[currentMessageStage]
      if (possibleInstances.some(InstanceClass => child instanceof InstanceClass)) {
        child.addToOptions(currentOptions)
        break
      }

      currentMessageStage += 1
      if (currentMessageStage >= MESSAGE_PARTS.length) {
        currentMessageStage = 0
        currentOptions = {
          content: '',
        }
        result.push(currentOptions)
      }
    }
  }

  return result
}

export function hydrateMessages(messages: Message[], container: Container) {
  for (const message of messages) {
    for (const actionRow of message.components) {
      for (const component of actionRow.components) {
        if (
          component.customId === null
          || container.hydratedIds.includes(component.customId)
        ) {
          continue
        }

        switch (component.type) {
          case ComponentType.Button: {
            const collector = message.createMessageComponentCollector({
              componentType: ComponentType.Button,
            })

            collector.on('collect', (interaction) => {
              const button = container.children
                .find((i): i is ButtonInstance =>
                  i instanceof ButtonInstance && i.data.customId === component.customId,
                )
              const onClick = button?.data.onClick

              if (onClick === undefined) {
                return
              }

              void interaction.deferUpdate()
              onClick(interaction)
            })

            container.hydratedIds.push(component.customId)

            break
          }

          case ComponentType.StringSelect: { throw new Error('Not implemented yet: ComponentType.StringSelect case') }
          case ComponentType.UserSelect: { throw new Error('Not implemented yet: ComponentType.UserSelect case') }
          case ComponentType.RoleSelect: { throw new Error('Not implemented yet: ComponentType.RoleSelect case') }
          case ComponentType.MentionableSelect: { throw new Error('Not implemented yet: ComponentType.MentionableSelect case') }
          case ComponentType.ChannelSelect: { throw new Error('Not implemented yet: ComponentType.ChannelSelect case') }
        }
      }
    }
  }
}

export function isMessageOptionsEmpty(options: MessageCreateOptions) {
  // TODO: Add more stuff here
  return options.content === undefined || options.content.trim() === ''
}
