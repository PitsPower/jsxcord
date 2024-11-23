import EventEmitter from 'node:events'
import { promises as fs } from 'node:fs'
import { useState } from 'react'
import { use } from 'react-use-polyfill'
import { useInteraction } from './hook'
import { sync } from './util'

/**
 * A generic class for specifying a way of storing data.
 *
 * {@link DataStore | `DataStore`} objects can be passed into shared state creators,
 * such as {@link createGuildState | `createGuildState`}, like so:
 *
 * ```ts
 * // Stores the value of `CounterState` in a JSON file.
 * const CounterState = createGuildState(0, new JsonDataStore("data/counter.json"))
 * ```
 *
 * You can extend {@link DataStore | `DataStore`} yourself to enable custom storage methods.
 * Here's an example of a {@link DataStore | `DataStore`} that stores data in memory:
 * ```
 * class MemoryDataStore<S> extends DataStore<S> {
 *   private data: Record<string, S> = {}
 *
 *   async get(key: string, initialValue: S) {
 *     return key in this.data ? this.data[key] : initialValue
 *   }
 *
 *   async set(key: string, value: S) {
 *     this.data[key] = value
 *   }
 * }
 * ```
 *
 * @typeParam Data - The data type stored in the {@link DataStore | `DataStore`}.
 */
export abstract class DataStore<Data> extends EventEmitter<{ change: [{ key: string, value: Data }] }> {
  /**
   * Gets some data from the {@link DataStore | `DataStore`}.
   *
   * @param key The key to get data from.
   *
   * The value of this key depends on context.
   * For example, when the {@link DataStore | `DataStore`} is used in
   * {@link createGuildState | `createGuildState`}, the key will be the guild id.
   *
   * @param initialValue The initial value of the data.
   * Return this if no data is present.
   *
   * @returns The data.
   */
  abstract get(key: string, initialValue: Data): Promise<Data>

  /**
   * Sets some data in the {@link DataStore | `DataStore`}.
   *
   * @param key The key to set data in.
   *
   * The value of this key depends on context.
   * For example, when the {@link DataStore | `DataStore`} is used in
   * {@link createGuildState | `createGuildState`}, the key will be the guild id.
   *
   * @param value The value to set it.
   */
  abstract set(key: string, value: Data): Promise<void>

  /**
   * Updates some data in the {@link DataStore | `DataStore`}
   * according to a transition function.
   *
   * This is useful if your storage method supports atomic transactions,
   * In that case, you should implement this method using transactions
   * for extra safety.
   *
   * @param key The key to set data in.
   *
   * The value of this key depends on context.
   * For example, when the {@link DataStore | `DataStore`} is used in
   * {@link createGuildState | `createGuildState`}, the key will be the guild id.
   *
   * @param initialValue The initial value of the data.
   *
   * @param transition A function that maps the old data to the new data.
   */
  async update(key: string, initialValue: Data, transition: (prevData: Data) => Data) {
    const value = transition(await this.get(key, initialValue))
    await this.set(key, value)
    return value
  }

  /** @internal */
  async updateAndEmit(key: string, initialValue: Data, transition: (prevState: Data) => Data) {
    const value = await this.update(key, initialValue, transition)
    this.emit('change', { key, value })
    return value
  }
}

class MemoryDataStore<Data> extends DataStore<Data> {
  private data: Record<string, Data> = {}

  async get(key: string, initialValue: Data) {
    return key in this.data ? this.data[key] : initialValue
  }

  async set(key: string, value: Data) {
    this.data[key] = value
  }
}
/**
 * An implementation of {@link DataStore | `DataStore`} that stores
 * data in a JSON file.
 *
 * @typeParam Data - The data type stored in the {@link JsonDataStore | `JsonDataStore`}.
 */
export class JsonDataStore<Data> extends DataStore<Data> {
  /**
   * @param fp The file path to store the data in.
   */
  constructor(private fp: string) {
    super()
    fs.access(fp).catch(async () => fs.writeFile(fp, '{}'))
  }

  async get(key: string, initialValue: Data) {
    const data = JSON.parse(await fs.readFile(this.fp, 'utf8')) as Record<string, Data>
    return key in data ? data[key] : initialValue
  }

  async set(key: string, value: Data) {
    const data = JSON.parse(await fs.readFile(this.fp, 'utf8')) as Record<string, Data>
    data[key] = value
    await fs.writeFile(this.fp, JSON.stringify(data))
  }
}

interface SharedState<Data> {
  readonly _type: 'guild'
  readonly _initialValue: Data
  readonly _isWatching: boolean
  readonly _dataStore: DataStore<Data>
  readonly _cache: Record<string, Promise<Data>>
}

export function createGuildState<Data>(
  initialValue: Data,
  dataStore?: DataStore<Data>,
): SharedState<Data> {
  return {
    _type: 'guild',
    _initialValue: initialValue,
    _isWatching: false,
    _dataStore: dataStore ?? new MemoryDataStore(),
    _cache: {},
  }
}

export function watch<Data>(sharedState: SharedState<Data>): SharedState<Data> {
  return { ...sharedState, _isWatching: true }
}

export function useSharedState<Data>(
  sharedState: SharedState<Data>,
): [Data, (transition: (prevState: Data) => Data) => void] {
  const interaction = useInteraction()
  const keys: Record<SharedState<Data>['_type'], string | null> = {
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

  const newSetState = sync(async (transition: (prevState: Data) => Data) => {
    const data = await sharedState._dataStore.updateAndEmit(key, sharedState._initialValue, transition)
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
