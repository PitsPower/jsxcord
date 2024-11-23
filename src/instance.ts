import type { ButtonInteraction, InteractionButtonComponentData, MessageCreateOptions, PollAnswerData, PollData } from 'discord.js'
import { ButtonStyle, ComponentType, escapeMarkdown } from 'discord.js'
import { v4 as uuidv4 } from 'uuid'

type InstanceType =
  | 'Answer'
  | 'Base'
  | 'Button'
  | 'Markdown'
  | 'Poll'
  | 'Text'
  | 'Whitelist'

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

  public isHidden = false

  constructor(public data: Data) {}
  abstract appendChild(child: InstanceOrText)
  abstract addToOptions(options: MessageCreateOptions)
}

export interface AnswerProps {
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

  appendChild(child: InstanceOrText) {
    this.data.text += enforceType(child, TextInstance).data
  }

  addToOptions() {
    throw new Error('Attempted to add `AnswerInstance` to message options. This is a bug!')
  }
}

export interface ButtonProps {
  onClick?: (interaction: ButtonInteraction) => void
}

export class ButtonInstance extends BaseInstance<InteractionButtonComponentData & ButtonProps> {
  static type: InstanceType = 'Button'

  static createInstance(props: ButtonProps) {
    return new ButtonInstance({
      type: ComponentType.Button,
      label: '',
      style: ButtonStyle.Primary,
      customId: uuidv4(),
      onClick: props.onClick,
    })
  }

  appendChild(child: InstanceOrText) {
    this.data.label += enforceType(child, TextInstance).data
  }

  addToOptions(options: MessageCreateOptions) {
    options.components = [
      ...(options.components ?? []),
      {
        type: ComponentType.ActionRow,
        components: [this.data],
      },
    ]
  }
}

export class MarkdownInstance extends BaseInstance<{ text: string }> {
  static type: InstanceType = 'Markdown'

  static createInstance() {
    return new MarkdownInstance({ text: '' })
  }

  appendChild(child: InstanceOrText) {
    this.data.text += enforceType(child, TextInstance).data
  }

  addToOptions(options: MessageCreateOptions) {
    options.content += this.data.text
  }
}

export interface PollProps {
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

  appendChild(child: InstanceOrText) {
    this.data.answers = [
      ...this.data.answers,
      enforceType(child, AnswerInstance).data,
    ]
  }

  addToOptions(options: MessageCreateOptions) {
    options.poll = this.data
  }
}

export class TextInstance extends BaseInstance<string> {
  static type: InstanceType = 'Text'

  appendChild() {
    throw new Error('Attempted to append child to `TextInstance`. This is a bug!')
  }

  addToOptions(options: MessageCreateOptions) {
    // Escape all Markdown in text
    options.content += escapeMarkdown(this.data, {
      bulletedList: true,
      heading: true,
      maskedLink: true,
      numberedList: true,
    })
  }
}

export interface WhitelistProps {
  users: string[]
}

export class WhitelistInstance extends BaseInstance<{
  users: string[]
  children: InstanceOrText[]
}> {
  static type: InstanceType = 'Whitelist'

  static createInstance(props: WhitelistProps) {
    return new WhitelistInstance({
      users: props.users,
      children: [],
    })
  }

  appendChild(child: InstanceOrText) {
    this.data.children = [...this.data.children, child]
  }

  addToOptions(options: MessageCreateOptions) {
    for (const child of this.data.children) {
      child.addToOptions(options)
    }
  }
}

export type Instance = AnswerInstance | ButtonInstance | MarkdownInstance | PollInstance | WhitelistInstance
export type InstanceOrText = Instance | TextInstance
