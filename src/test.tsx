import { bot, Button, createGuildState, JsonDataStore, useSharedState } from '.'

const CounterState = createGuildState(0, new JsonDataStore('data/counter.json'))

function Counter() {
  const [count, setCount] = useSharedState(CounterState)
  return (
    <>
      Count: {count}
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
