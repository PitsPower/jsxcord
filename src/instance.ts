import type { MessageCreateOptions, PollAnswerData, PollData } from 'discord.js'

type InstanceType =
  | 'Answer'
  | 'Base'
  | 'Poll'
  | 'Text'

function formatType(type: InstanceType) {
  return type === 'Text' ? 'text' : `\`<${type}>\``
}

function enforceType<I extends InstanceOrText>(
  instance: InstanceOrText,
  InstanceClass: { type: InstanceType, new(data: unknown): I },
): I {
  if (instance instanceof InstanceClass) {
    return instance
  }
  else {
    throw new TypeError(
      `Expected ${formatType(InstanceClass.type)}, found ${formatType(instance.getType())}.`,
    )
  }
}

abstract class BaseInstance<Data> {
  static type: InstanceType = 'Base'
  public getType() {
    return (this.constructor as typeof BaseInstance<Data>).type
  }

  constructor(public data: Data) {}
  abstract appendChild(child: Instance | TextInstance): void
  abstract addToOptions(options: MessageCreateOptions)
}

interface PollProps {
  question: string
}

export class PollInstance extends BaseInstance<PollData> {
  static type: InstanceType = 'Poll'

  static createInstance(props: PollProps) {
    return new PollInstance({
      question: { text: props.question },
      answers: [],
      duration: 24,
      allowMultiselect: false,
    })
  }

  appendChild(child: Instance | TextInstance) {
    this.data.answers = [
      ...this.data.answers,
      enforceType(child, AnswerInstance).data,
    ]
  }

  addToOptions(options: MessageCreateOptions) {
    options.poll = this.data
  }
}

interface AnswerProps {
  emoji?: string
}

export class AnswerInstance extends BaseInstance<PollAnswerData> {
  static type: InstanceType = 'Answer'

  static createInstance(props: AnswerProps) {
    return new AnswerInstance({
      text: '',
      emoji: props.emoji,
    })
  }

  appendChild(child: Instance | TextInstance) {
    this.data.text += enforceType(child, TextInstance).data
  }

  addToOptions(_options: MessageCreateOptions) {
    throw new Error('Not implemented.')
  }
}

export class TextInstance extends BaseInstance<string> {
  static type: InstanceType = 'Text'

  appendChild() {
    throw new Error('Attempted to append child to `TextInstance`. This is a bug!')
  }

  addToOptions(options: MessageCreateOptions) {
    options.content += this.data
  }
}

export type Instance = PollInstance | AnswerInstance
export type InstanceOrText = Instance | TextInstance
