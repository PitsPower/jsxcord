import type { ApplicationCommandOptionBase, ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js'
import type { ReactNode } from 'react'
import { Attachment, User } from 'discord.js'
import { z } from 'zod'

type AutocompleteFunction = (query: string) => Promise<{
  duration?: number
  name: string
  value: string
}[]>

declare module 'zod' {
  export interface ZodString {
    _autocompleteFunc?: AutocompleteFunction
    autocomplete: (func: AutocompleteFunction) => ZodString
  }
}

z.ZodString.prototype.autocomplete = function (this: z.ZodString, func) {
  this._autocompleteFunc = func
  return this
}

/** Creates a custom ZodType from a class */
// This is needed instead of just `z.custom` as it gives us a class
// that we can do `instanceof` on
function customZodType<T>(type: { new(...args: any[]): T }) {
  return class extends z.ZodType<T> {
    private schema = z.custom<T>(val => val instanceof type)
    _parse(input: z.ParseInput): z.ParseReturnType<T> {
      return this.schema._parse(input)
    }
  }
}

// @ts-expect-error: Class has a protected constructor, but we don't care
const DiscordUserType = customZodType(User)
// @ts-expect-error: Class has a protected constructor, but we don't care
const DiscordAttachmentType = customZodType(Attachment)

/** Custom zod types for Discord arguments */
export const discord = {
  user: () => new DiscordUserType({}),
  attachment: () => new DiscordAttachmentType({}),
}

/** Given the Zod type, calls the relevant builder methods */
export function buildZodType(
  builder: SlashCommandOptionsOnlyBuilder,
  key: string,
  value: any,
  augmentOptionFuncs: (<T extends ApplicationCommandOptionBase>(option: T) => T)[] = [],
) {
  if (!(value instanceof z.ZodType))
    throw new TypeError('Unhandled type in command options. This is a bug!')

  /** Adds the name, description, etc. */
  const augmentOption = <T extends ApplicationCommandOptionBase>(option: T): T => {
    option = option.setName(key)
    option = option.setDescription(value.description ?? 'No description')

    if (!value.isOptional())
      option = option.setRequired(true)

    for (const func of augmentOptionFuncs) {
      option = func(option)
    }

    return option
  }

  if (value instanceof z.ZodString) {
    builder.addStringOption((option) => {
      option = augmentOption(option)

      if (value._autocompleteFunc !== undefined)
        option = option.setAutocomplete(true)

      return option
    })
  }
  else if (value instanceof z.ZodBoolean) {
    builder.addBooleanOption(augmentOption)
  }
  else if (value instanceof z.ZodNumber) {
    if (value.isInt) {
      builder.addIntegerOption((option) => {
        option = augmentOption(option)

        if (value.minValue !== null) {
          option = option.setMinValue(value.minValue)
        }
        if (value.maxValue !== null) {
          option = option.setMaxValue(value.maxValue)
        }

        return option
      })
    }
    else {
      builder.addNumberOption((option) => {
        option = augmentOption(option)

        if (value.minValue !== null) {
          option = option.setMinValue(value.minValue)
        }
        if (value.maxValue !== null) {
          option = option.setMaxValue(value.maxValue)
        }

        return option
      })
    }
  }
  else if (value instanceof z.ZodEnum) {
    builder.addStringOption((option) => {
      option = augmentOption(option)

      const choices = z.string().array().parse(value.options)
      option = option.setChoices(...choices.map(o => ({ name: o, value: o })))

      return option
    })
  }
  else if (value instanceof DiscordUserType) {
    builder.addUserOption(augmentOption)
  }
  else if (value instanceof DiscordAttachmentType) {
    builder.addAttachmentOption(augmentOption)
  }
  else if (value instanceof z.ZodOptional || value instanceof z.ZodDefault) {
    buildZodType(builder, key, value._def.innerType, [
      augmentOption,
      option => option.setRequired(false),
    ])
  }
  else if (value instanceof z.ZodEffects) {
    buildZodType(builder, key, value.innerType(), [augmentOption])
  }
  else {
    throw new TypeError('Unhandled type in command options. This is a bug!')
  }
}

/** Convert Discord.js command options to an object */
export function getOptionsAsObject(options: ChatInputCommandInteraction['options']) {
  return Object.fromEntries(
    // Hack: options.data only contains options for parent command,
    // access private _hoistedOptions instead to get all options (including subcommands)

    // eslint-disable-next-line ts/no-unsafe-member-access
    ((options as any)._hoistedOptions as ChatInputCommandInteraction['options']['data'])
      .map(option => [option.name, option.attachment ?? option.member ?? option.value]),
  )
}

type ComponentFunc<T extends z.ZodRawShape> = (props: z.infer<z.ZodObject<T>>) => ReactNode

export interface ZodCommand<
  T extends z.ZodRawShape,
  HasComponent extends boolean,
> extends z.ZodObject<T> {
  _componentFunc: HasComponent extends true ? ComponentFunc<T> : null
  component: (componentFunc: ComponentFunc<T>) => ZodCommand<z.ZodRawShape, true>
}

export function command<T extends z.ZodRawShape>(args: T): ZodCommand<T, false> {
  const result = z.object(args) as ZodCommand<T, false>

  result._componentFunc = null
  result.component = (componentFunc) => {
    const newResult = result as unknown as ZodCommand<z.ZodRawShape, true>
    newResult._componentFunc = componentFunc
    return newResult
  }

  return result
}
