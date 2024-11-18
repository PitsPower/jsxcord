import type { ReactNode } from 'react'
import type { NodeProps } from './component'
import type { Container } from './container'
import type { Instance } from './instance'
import Reconciler from 'react-reconciler'
import { TextInstance } from './instance'

const reconciler = Reconciler<
  'node',
  NodeProps<Record<string, unknown>, Instance>,
  Container,
  Instance,
  TextInstance,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  number,
  -1
>({
  isPrimaryRenderer: true,
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  noTimeout: -1,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,

  createInstance(_type, { props, createInstance }) {
    return createInstance(props)
  },

  createTextInstance(text) {
    return new TextInstance(text)
  },

  appendInitialChild(parentInstance, child) {
    parentInstance.appendChild(child)
  },

  finalizeInitialChildren() {
    return false
  },

  prepareUpdate() {
    throw new Error('Function not implemented.')
  },

  shouldSetTextContent() {
    return false
  },

  getRootHostContext() {
    return null
  },

  getChildHostContext(parentHostContext) {
    return parentHostContext
  },

  getPublicInstance() {
    throw new Error('Function not implemented.')
  },

  prepareForCommit() {
    return null
  },

  resetAfterCommit() {},

  preparePortalMount() {
    throw new Error('Function not implemented.')
  },

  getCurrentEventPriority(): Reconciler.Lane {
    throw new Error('Function not implemented.')
  },

  getInstanceFromNode() {
    throw new Error('Function not implemented.')
  },

  beforeActiveInstanceBlur(): void {
    throw new Error('Function not implemented.')
  },

  afterActiveInstanceBlur(): void {
    throw new Error('Function not implemented.')
  },

  prepareScopeUpdate() {
    throw new Error('Function not implemented.')
  },

  getInstanceFromScope() {
    throw new Error('Function not implemented.')
  },

  detachDeletedInstance() {
    throw new Error('Function not implemented.')
  },

  clearContainer(container) {
    container.children = []
  },

  appendChildToContainer(container, child) {
    container.children.push(child)
  },
})

export default {
  render: (element: ReactNode, container: Container) => {
    // eslint-disable-next-line ts/no-unsafe-assignment
    const root = reconciler.createContainer(
      container,
      0,
      null,
      false,
      false,
      '',
      () => {},
      null,
    )
    reconciler.updateContainer(element, root)
  },
}
