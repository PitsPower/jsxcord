import { useContext } from 'react'
import { InteractionContext } from '.'

/** Returns the `Interaction` that executed the command */
export function useInteraction() {
  const result = useContext(InteractionContext)
  if (result === null) {
    throw new Error('Cannot use `useInteraction` outside of a Reactshun component.')
  }
  return result
}
