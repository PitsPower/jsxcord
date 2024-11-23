import { bot, Button } from '.'
import { createGuildState, JsonDataStore, useSharedState, watch } from './shared'

const CounterState = createGuildState(0, new JsonDataStore('data/counter.json'))

function Counter() {
  const [count, setCount] = useSharedState(CounterState)
  return (
    <>
      <>{count}</>
      <Button onClick={() => setCount(count => count + 1)}>Increment</Button>
    </>
  )
}

const client = bot({
  counter: <Counter />,
})

client
  // eslint-disable-next-line no-console
  .on('ready', () => console.log('Bot started'))
  .login('BOT TOKEN')
  .catch(console.error)
