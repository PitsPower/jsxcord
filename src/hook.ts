import { useContext } from 'react'
import { InteractionContext } from '.'

/**
 * Returns the `Interaction` that executed the command.
 * Must be used inside a JSXcord component.
 * @category Hooks
 */
export function useInteraction() {
  const result = useContext(InteractionContext)
  if (result === null) {
    throw new Error('Cannot use `useInteraction` outside of a JSXcord component.')
  }
  return result
}
