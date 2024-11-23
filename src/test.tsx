import { z } from 'zod'
import { bot } from '.'
import { command } from './zod'

const saySchema = command({ message: z.string() })

function Say({ message }: z.infer<typeof saySchema>) {
  return message
}

const client = bot({
  say: saySchema.component(Say),
})

client
  // eslint-disable-next-line no-console
  .on('ready', () => console.log('Bot started'))
  .login('BOT TOKEN')
  .catch(console.error)
