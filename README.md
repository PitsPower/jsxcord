# THIS PACKAGE IS IN EARLY DEVELOPMENT! IT IS VERY MUCH INCOMPLETE!

# JSXcord
Easily create Discord bots using React.

## Installation
```sh
npm install jsxcord
```

## Examples

Writing a `/ping` command that replies with "Pong!" is easy:

```tsx
import { bot } from 'jsxcord'
import { BOT_TOKEN } from './config'

bot({ ping: 'Pong!' }).login(BOT_TOKEN)
```

More generally, commands can be created using React components and hooks, such as this simple `/counter` command:

```tsx
import { bot, Button } from 'jsxcord'
import React, { useState } from 'react'
import { BOT_TOKEN } from './config'

function Counter() {
  // The `useState` hook, built into React
  const [count, setCount] = useState(0)
  return (
    <>
      {count}
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </>
  )
}

// Passing in components directly
bot({ counter: <Counter /> }).login(BOT_TOKEN)
```

## Components

Nearly all visual (and auditory!) elements of a Discord bot have their own component. Some examples include:

- {@link Heading | `<Heading>`}, {@link Subheading | `<Subheading>`}, etc. for headings of various sizes.
- {@link Button | `<Button>`} for interactive buttons.
- {@link Audio | `<Audio>`} for playing audio in a voice channel.
- Many more!

## Hooks

JSXcord renders real React code, so you can use all the standard React hooks, such as `useState`, `useEffect`, `useContext`, etc.

JSXcord also introduces new hooks:
- {@link useInteraction | `useInteraction`} returns the Discord.js `Interaction` that executed the command.
- {@link useSharedState | `useSharedState`} returns a state that can be stored per guild, user, or member.
- Many more!
