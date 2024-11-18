import type { MessageCreateOptions } from 'discord.js'
import type { Container } from './container'
import { PollInstance, TextInstance } from './instance'

const MESSAGE_PARTS = [
  [TextInstance],
  [PollInstance],
]

export function createMessageOptions(container: Container): MessageCreateOptions[] {
  let currentOptions: MessageCreateOptions = {
    content: '',
  }
  let currentMessageStage = 0
  const result = [currentOptions]

  for (const child of container.children) {
    while (true) {
      const possibleInstances = MESSAGE_PARTS[currentMessageStage]
      if (possibleInstances.some(InstanceClass => child instanceof InstanceClass)) {
        child.addToOptions(currentOptions)
        break
      }

      currentMessageStage += 1
      if (currentMessageStage >= MESSAGE_PARTS.length) {
        currentOptions = {
          content: '',
        }
        currentMessageStage = 0
        result.push(currentOptions)
      }
    }
  }

  return result
}
