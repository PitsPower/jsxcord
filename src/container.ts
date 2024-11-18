import type { Client } from 'discord.js'
import type { InstanceOrText } from './instance'

export interface Container {
  client: Client
  children: InstanceOrText[]
  onChange?: () => Promise<void>
}

export function create(client: Client): Container {
  return {
    client,
    children: [],
  }
}
