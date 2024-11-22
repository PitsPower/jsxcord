import { bot, Button, Whitelist } from '.'
import { createGuildState, JsonDataStore, useSharedState } from './shared'

const CounterState = createGuildState(0, new JsonDataStore('data/counter.json'))

function Test() {
  const [count, setCount] = useSharedState(CounterState)
  return (
    <Whitelist>
      {count}
      <Button onClick={() => setCount(count => count + 1)}>Increment</Button>
    </Whitelist>
  )
}

const client = bot({
  test: <Test />,
})

client
  // eslint-disable-next-line no-console
  .on('ready', () => console.log('Bot started'))
  .login('BOT TOKEN')
  .catch(console.error)
