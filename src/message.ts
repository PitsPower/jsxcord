import type { Container } from './container'
import type { Instance, InstanceOrText } from './instance'
import { ComponentType, InteractionResponse, type Message, type MessageCreateOptions } from 'discord.js'
import { ButtonInstance, MarkdownInstance, PollInstance, TextInstance, WhitelistInstance } from './instance'

const UNRENDERED_MESSAGE_PARTS = [
  WhitelistInstance,
]

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
      const possibleInstances = [
        ...UNRENDERED_MESSAGE_PARTS,
        ...MESSAGE_PARTS[currentMessageStage],
      ]
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

interface InstanceWithWhitelist<I extends Instance> {
  instance: I
  users?: string[]
}

function findButtonWithId(
  children: InstanceOrText[],
  id: string,
  users?: string[],
): InstanceWithWhitelist<ButtonInstance> | undefined {
  for (const child of children) {
    if (child instanceof ButtonInstance && child.data.customId === id) {
      return {
        instance: child,
        users,
      }
    }

    if (child instanceof WhitelistInstance) {
      const button = findButtonWithId(child.data.children, id, child.data.users)
      if (button !== undefined) {
        return button
      }
    }
  }
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
              if (component.customId === null) {
                return
              }

              const button = findButtonWithId(container.children, component.customId)
              const onClick = button?.instance.data.onClick
              const allowedUsers = button?.users

              if (
                onClick === undefined
                || (allowedUsers !== undefined && !allowedUsers.includes(interaction.user.id))
              ) {
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
