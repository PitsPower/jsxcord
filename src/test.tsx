import { useState } from 'react'
import { bot, Button } from '.'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <>
      {count}
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </>
  )
}

bot({ ping: 'Pong!', counter: <Counter /> })
  // eslint-disable-next-line no-console
  .on('ready', () => console.log('Bot started'))
  .login('BOT TOKEN')
  .catch(console.error)
