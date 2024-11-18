import type { PropsWithChildren, ReactNode } from 'react'
import { createElement } from 'react'
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
