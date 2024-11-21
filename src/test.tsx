import { useState } from 'react'
import { bot, Br, Code, CodeBlock, Header, Quote, Subheader, Subsubheader, Timer, Tiny } from '.'

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
      <Header>Header</Header>
      <Subheader>Subheader</Subheader>
      <Subsubheader>Subsubheader</Subsubheader>
      <Tiny>Tiny</Tiny>

      <Br />

      <Code>Code</Code>
      <Br />
      <CodeBlock>CodeBlock</CodeBlock>
      <CodeBlock language="javascript">
        console.log('Hello, world!')
      </CodeBlock>

      <Br />

      <Quote>Quote</Quote>
    </>
  ),
  timer: <TimerTest />,
})

client
  // eslint-disable-next-line no-console
  .on('ready', () => console.log('Bot started'))
  .login('BOT TOKEN')
  .catch(console.error)
