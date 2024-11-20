import { useState } from 'react'
import { Audio, bot, Timer } from '.'

function TimerTest() {
  const [ended, setEnded] = useState(false)
  return ended
    ? 'Timer ended!'
    : <Timer seconds={10} onEnd={() => setEnded(true)} />
}

const client = bot({
  ping: 'Pong!',
  test: (
    <>
      Playing audio
      <Audio src="./assets/test.mp3" />
    </>
  ),
  timer: <TimerTest />,
})

client
// eslint-disable-next-line no-console
  .on('ready', () => console.log('Bot started'))
  .login('BOT TOKEN')
  .catch(console.error)
