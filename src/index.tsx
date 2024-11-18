import type { Message } from 'discord.js'
import { Client } from 'discord.js'
import { useState } from 'react'
import { Answer, Button, Poll } from './component'
import * as container from './container'
import { createMessageOptions, hydrateMessages } from './message'
import Renderer from './renderer'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
      {count}
    </>
  )
}

async function main() {
  const client = new Client({ intents: [] })
  await client.login('BOT TOKEN')

  const channel = await client.channels.fetch('1172265844961714259')
  const messages: Message[] = []

  const root = container.create()
  Renderer.render(<App />, root)

  const messageOptions = createMessageOptions(root)

  if (channel?.isSendable()) {
    for (const options of messageOptions) {
      messages.push(await channel.send(options))
    }
  }

  hydrateMessages(messages, root)

  root.onChange = async () => {
    const newOptions = createMessageOptions(root)

    await Promise.all(newOptions.map(async (options, i) => {
      if (messages[i] !== undefined && JSON.stringify(messageOptions[i]) !== JSON.stringify(options)) {
        messageOptions[i] = options
        return messages[i].edit({
          ...options,
          flags: [],
        })
      }
    }))
  }
}

void main()
