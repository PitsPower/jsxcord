import { promises as fs } from 'node:fs'
import { useState } from 'react'
import { use } from 'react-use-polyfill'
import { useInteraction } from './hook'
import { sync } from './util'

export abstract class DataStore<S> {
  abstract get(key: string, initialValue: S): Promise<S>
  abstract set(key: string, value: S): Promise<void>

  async update(key: string, initialValue: S, transition: (prevState: S) => S) {
    const value = transition(await this.get(key, initialValue))
    await this.set(key, value)
    return value
  }
}

class MemoryDataStore<S> extends DataStore<S> {
  private data: Record<string, S> = {}

  async get(key: string, initialValue: S): Promise<S> {
    return key in this.data ? this.data[key] : initialValue
  }

  async set(key: string, value: S): Promise<void> {
    this.data[key] = value
  }
}

export class JsonDataStore<S> extends DataStore<S> {
  constructor(private fp: string) {
    super()
    fs.access(fp).catch(async () => fs.writeFile(fp, '{}'))
  }

  async get(key: string, initialValue: S): Promise<S> {
    const data = JSON.parse(await fs.readFile(this.fp, 'utf8')) as Record<string, S>
    return key in data ? data[key] : initialValue
  }

  async set(key: string, value: S): Promise<void> {
    const data = JSON.parse(await fs.readFile(this.fp, 'utf8')) as Record<string, S>
    data[key] = value
    await fs.writeFile(this.fp, JSON.stringify(data))
  }
}

interface SharedState<S> {
  type: 'guild'
  initialValue: S
  dataStore: DataStore<S>
  cache: Record<string, Promise<S>>
}

export function createGuildState<S>(initialValue: S, dataStore?: DataStore<S>): SharedState<S> {
  return {
    type: 'guild',
    initialValue,
    dataStore: dataStore ?? new MemoryDataStore(),
    cache: {},
  }
}

export function useSharedState<S>(
  sharedState: SharedState<S>,
): [S, (transition: (prevState: S) => S) => void] {
  const interaction = useInteraction()
  const keys: Record<SharedState<S>['type'], string | null> = {
    guild: interaction.guildId,
  }
  const key = keys[sharedState.type]
  if (key === null) {
    throw new Error('Attempted to use a `GuildState` outside of a guild.')
  }

  if (!(key in sharedState.cache)) {
    sharedState.cache[key] = sharedState.dataStore.get(key, sharedState.initialValue)
  }

  const value = use(sharedState.cache[key])
  delete sharedState.cache[key]

  const [state, setState] = useState(value)

  const newSetState = sync(async (transition: (prevState: S) => S) => {
    const data = await sharedState.dataStore.update(key, sharedState.initialValue, transition)
    setState(data)
  })

  return [state, newSetState]
}
