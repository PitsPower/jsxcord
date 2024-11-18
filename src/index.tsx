import { Client } from 'discord.js'
import { Answer, Poll } from './component'
import * as container from './container'
import { createMessageOptions } from './message'
import Renderer from './renderer'

const root = container.create()

Renderer.render(
  <>
    Example of Poll
    <Poll question="What is your favourite fruit?">
      <Answer emoji="🍎">Apple</Answer>
      <Answer emoji="🍌">Apple</Answer>
    </Poll>

    Example of Another Poll
    <Poll question="What is your favourite fruit?">
      <Answer emoji="🍎">Apple</Answer>
      <Answer emoji="🍌">Apple</Answer>
    </Poll>

    Sending multiple messages in one component!
  </>,
  root,
)

async function main() {
  const client = new Client({ intents: [] })
  await client.login('BOT TOKEN')

  const channel = await client.channels.fetch('295979103843254283')

  if (channel?.isSendable()) {
    for (const options of createMessageOptions(root)) {
      await channel.send(options)
    }
  }
}

void main()
