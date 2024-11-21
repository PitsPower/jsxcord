import { bot, Button, useGuildState } from '.'

function Test() {
  const [count, setCount] = useGuildState(0)
  return (
    <>
      {count}
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </>
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
