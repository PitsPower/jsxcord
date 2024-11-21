import { useContext, useEffect, useState } from 'react'
import { use } from 'react-use-polyfill'
import { GuildDataStoreContext, InteractionContext } from '.'
import { NOT_CACHED } from './store'

/** Returns the `Interaction` that executed the command */
export function useInteraction() {
  const result = useContext(InteractionContext)
  if (result === null) {
    throw new Error('Cannot use `useInteraction` outside of a Reactshun component.')
  }
  return result
}

/** Same as `useState`, but per guild */
export function useGuildState<S>(
  initialState?: S | (() => S),
): [S, (state: S | ((prevState: S) => S)) => void] {
  const { guildId } = useInteraction()
  if (guildId === null) {
    throw new Error('Attempted to use `useGuildState` outside of a guild.')
  }

  const guildDataStore = useContext(GuildDataStoreContext)
  if (guildDataStore === null) {
    throw new Error('Cannot use `useGuildState` outside of a Reactshun component.')
  }

  const cachedValue = guildDataStore.getCached(guildId)
  const value = (
    cachedValue === NOT_CACHED
      ? use(guildDataStore.get(guildId, initialState))
      : cachedValue
  ) as S

  const [guildState, setGuildState] = useState(value)

  useEffect(() => {
    const listener = (value: S) => {
      setGuildState(value)
    }

    guildDataStore.onChange(guildId, listener)
    return () => guildDataStore.offChange(guildId, listener)
  }, [])

  useEffect(() => {
    void guildDataStore.set(guildId, guildState)
  }, [guildState])

  return [guildState, setGuildState]
}
