import type { InstanceOrText } from './instance'

export interface Container {
  children: InstanceOrText[]
}

export function create(): Container {
  return {
    children: [],
  }
}
