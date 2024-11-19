import { Audio, bot } from '.'

const client = bot({
  ping: 'Pong!',
  test: (
    <>
      Playing audio
      <Audio src="./assets/test.mp3" />
    </>
  ),
})

client
// eslint-disable-next-line no-console
  .on('ready', () => console.log('Bot started'))
  .login('BOT TOKEN')
  .catch(console.error)
