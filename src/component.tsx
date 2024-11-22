import type { PropsWithChildren, ReactNode } from 'react'
import type { TrackHandle } from './audio'
import type { ButtonProps, Instance, WhitelistProps } from './instance'
import type { ALL_LANGUAGES } from './languages'
import path from 'node:path'
import { time, TimestampStyles } from 'discord.js'
import { createElement, useContext, useEffect, useState } from 'react'
import { AudioContext, useInteraction } from '.'
import { streamFromFile } from './audio'
import { AnswerInstance, ButtonInstance, MarkdownInstance, PollInstance, WhitelistInstance } from './instance'

export interface NodeProps<P, I extends Instance> {
  props: P
  children: ReactNode
  createInstance: (props: P) => I
}

function Node<P, I extends Instance>(props: NodeProps<P, I>) {
  return createElement('node', props)
}

function createComponent<P, I extends Instance>(
  InstanceClass: { createInstance: (props: P) => I },
): (props: PropsWithChildren<P>) => JSX.Element {
  return props => (
    <Node props={props} createInstance={InstanceClass.createInstance}>
      {props.children}
    </Node>
  )
}

export const Answer = createComponent(AnswerInstance)
export const Markdown = createComponent(MarkdownInstance)
export const Poll = createComponent(PollInstance)

const RawButton = createComponent(ButtonInstance)

export function Button(props: PropsWithChildren<ButtonProps>) {
  return <RawButton {...props} />
}

function createMarkdownComponent<Props>(func: (input: string, props: Props) => string) {
  return (props: PropsWithChildren<Props>) => {
    const input = props.children?.toString()
    if (input === undefined) {
      throw new Error('Expected text in <Markdown>.')
    }
    return <Markdown>{func(input, props)}</Markdown>
  }
}

export const Br = () => '\n'

export const Header = createMarkdownComponent(str => `# ${str}\n`)
export const Subheader = createMarkdownComponent(str => `## ${str}\n`)
export const Subsubheader = createMarkdownComponent(str => `### ${str}\n`)
export const Tiny = createMarkdownComponent(str => `-# ${str}\n`)

export const Code = createMarkdownComponent(str => `\`${str}\``)
export const CodeBlock = createMarkdownComponent<{ language?: typeof ALL_LANGUAGES[number] }>(
  (str, props) =>
    `\`\`\`${props.language ?? ''}\n${str}\`\`\``,
)

export const Quote = createMarkdownComponent(str => `> ${str}\n`)

interface AudioProps {
  src: string
  paused?: boolean
}

export function Audio({ src, paused }: AudioProps) {
  const audioContext = useContext(AudioContext)
  const [track, setTrack] = useState<TrackHandle | null>(null)

  useEffect(() => {
    audioContext?.joinVc()

    const stream = streamFromFile(path.resolve(src))
    setTrack(audioContext?.mixer.playTrack(stream, paused) ?? null)

    return () => {
      if (track !== null) {
        audioContext?.mixer.stopTrack(track)
        setTrack(null)
      }
    }
  }, [])

  useEffect(() => {
    if (track === null) {
      return
    }

    paused ? audioContext?.mixer.pauseTrack(track) : audioContext?.mixer.resumeTrack(track)
  }, [paused])

  return <></>
}

interface TimerProps {
  seconds: number
  onEnd?: () => void
}

export function Timer({ seconds, onEnd }: TimerProps) {
  useEffect(() => {
    const timeout = setTimeout(() => onEnd?.(), seconds * 1000)
    return () => clearTimeout(timeout)
  }, [])

  return time(new Date(Date.now() + seconds * 1000), TimestampStyles.RelativeTime)
}

export function Whitelist(props: PropsWithChildren<Partial<WhitelistProps>>) {
  const interaction = useInteraction()

  const newProps: WhitelistProps = {
    ...props,
    users: props.users ?? [interaction.user.id],
  }

  return (
    <Node props={newProps} createInstance={props => WhitelistInstance.createInstance(props)}>
      {props.children}
    </Node>
  )
}
