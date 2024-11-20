import type { PropsWithChildren, ReactNode } from 'react'
import type { TrackHandle } from './audio'
import path from 'node:path'
import { createElement, useContext, useEffect, useState } from 'react'
import { AudioContext } from '.'
import { streamFromFile } from './audio'
import { AnswerInstance, ButtonInstance, type Instance, PollInstance } from './instance'

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
export const Button = createComponent(ButtonInstance)
export const Poll = createComponent(PollInstance)

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

  return (
    <>
      {`<t:${Math.round(Date.now() / 1000) + seconds}:R>`}
    </>
  )
}
