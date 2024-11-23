import EventEmitter from 'node:events'
import { promises as fs } from 'node:fs'
import { useState } from 'react'
import { use } from 'react-use-polyfill'
import { useInteraction } from './hook'
import { sync } from './util'

export abstract class DataStore<S> extends EventEmitter<{ change: [{ key: string, value: S }] }> {
  private static HAS_EMITTED = Symbol('HAS_EMITTED')

  abstract get(key: string, initialValue: S): Promise<S>
  abstract set(key: string, value: S): Promise<typeof DataStore.HAS_EMITTED>

  emitChange(key: string, value: S): typeof DataStore.HAS_EMITTED {
    this.emit('change', { key, value })
    return DataStore.HAS_EMITTED
  }

  async update(key: string, initialValue: S, transition: (prevState: S) => S) {
    const value = transition(await this.get(key, initialValue))
    await this.set(key, value)
    return value
  }
}

class MemoryDataStore<S> extends DataStore<S> {
  private data: Record<string, S> = {}

  async get(key: string, initialValue: S) {
    return key in this.data ? this.data[key] : initialValue
  }

  async set(key: string, value: S) {
    this.data[key] = value
    return super.emitChange(key, value)
  }
}

export class JsonDataStore<S> extends DataStore<S> {
  constructor(private fp: string) {
    super()
    fs.access(fp).catch(async () => fs.writeFile(fp, '{}'))
  }

  async get(key: string, initialValue: S) {
    const data = JSON.parse(await fs.readFile(this.fp, 'utf8')) as Record<string, S>
    return key in data ? data[key] : initialValue
  }

  async set(key: string, value: S) {
    const data = JSON.parse(await fs.readFile(this.fp, 'utf8')) as Record<string, S>
    data[key] = value
    await fs.writeFile(this.fp, JSON.stringify(data))
    return super.emitChange(key, value)
  }
}

interface SharedState<S> {
  readonly _type: 'guild'
  readonly _initialValue: S
  readonly _isWatching: boolean
  readonly _dataStore: DataStore<S>
  readonly _cache: Record<string, Promise<S>>
}

export function createGuildState<S>(initialValue: S, dataStore?: DataStore<S>): SharedState<S> {
  return {
    _type: 'guild',
    _initialValue: initialValue,
    _isWatching: false,
    _dataStore: dataStore ?? new MemoryDataStore(),
    _cache: {},
  }
}

export function watch<S>(sharedState: SharedState<S>): SharedState<S> {
  return { ...sharedState, _isWatching: true }
}

export function useSharedState<S>(
  sharedState: SharedState<S>,
): [S, (transition: (prevState: S) => S) => void] {
  const interaction = useInteraction()
  const keys: Record<SharedState<S>['_type'], string | null> = {
    guild: interaction.guildId,
  }
  const key = keys[sharedState._type]
  if (key === null) {
    throw new Error('Attempted to use a `GuildState` outside of a guild.')
  }

  if (!(key in sharedState._cache)) {
    sharedState._cache[key] = sharedState._dataStore.get(key, sharedState._initialValue)
  }

  const value = use(sharedState._cache[key])
  delete sharedState._cache[key]

  const [state, setState] = useState(value)

  const newSetState = sync(async (transition: (prevState: S) => S) => {
    const data = await sharedState._dataStore.update(key, sharedState._initialValue, transition)
    setState(data)
  })

  if (sharedState._isWatching) {
    sharedState._dataStore.once('change', ({ key: k, value: v }) => {
      if (k === key) {
        setState(v)
      }
    })
  }

  return [state, newSetState]
}
