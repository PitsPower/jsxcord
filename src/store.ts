/** Stores key value pairs */
interface DataStore<Key, Value> {
  get: (key: Key, defaultValue: Value) => Promise<Value>
  set: (key: Key, value: Value) => Promise<void>
}

/** A data store that notifies when the data changes */
export interface NotifyingDataStore<Key, Value> extends DataStore<Key, Value> {
  onChange: (key: Key, listener: (value: Value) => void) => void
  offChange: (key: Key, listener: (value: Value) => void) => void
}

export function notifier<Value, Store extends DataStore<string, Value>>(
  dataStore: Store,
): NotifyingDataStore<string, Value> & Store {
  const listeners: Record<string, ((value: Value) => void)[]> = {}

  return {
    ...dataStore,

    async set(key: string, value: Value): Promise<void> {
      (listeners[key] ?? []).forEach(listener => listener(value))
      return dataStore.set(key, value)
    },

    onChange(key, listener) {
      listeners[key] = [
        ...(listeners[key] ?? []),
        listener,
      ]
    },
    offChange(key, listener) {
      listeners[key] = listeners[key].filter(l => l !== listener)
    },
  }
}

export const NOT_CACHED = Symbol('NOT_CACHED')

/** A data store that has a `get` function with gives a cached value */
export interface CachedDataStore<Key, Value> extends DataStore<Key, Value> {
  getCached: (key: Key) => Value | typeof NOT_CACHED
}

/** Converts a data store into a cached version, which saves calls to `get` */
export function cached<Value, Store extends DataStore<string, Value>>(
  dataStore: Store,
): CachedDataStore<string, Value> & Store {
  const cachedResults: Record<string, Value> = {}

  return {
    ...dataStore,

    async get(key: string, defaultValue: Value): Promise<void> {
      const value = await dataStore.get(key, defaultValue)
      cachedResults[key] = value
    },

    async set(key: string, value: Value): Promise<void> {
      cachedResults[key] = value
      await dataStore.set(key, value)
    },

    getCached(key) {
      return key in cachedResults ? cachedResults[key] : NOT_CACHED
    },
  }
}

const guildData: Record<string, unknown> = {}

export const defaultGuildDataStore: DataStore<string, unknown> = {
  async get(key: string, defaultValue: unknown): Promise<unknown> {
    return key in guildData ? guildData[key] : defaultValue
  },

  async set(key: string, value: unknown): Promise<void> {
    guildData[key] = value
  },
}
