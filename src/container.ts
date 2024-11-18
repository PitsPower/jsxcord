import type { InstanceOrText } from './instance'

export interface Container {
  children: InstanceOrText[]
  onChange?: () => Promise<void>
}

export function create(): Container {
  return {
    children: [],
  }
}
