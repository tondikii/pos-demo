import type { ComponentProps, ParentProps } from 'solid-js'
import { splitProps } from 'solid-js'
import { Motion } from '@motionone/solid'

export interface CardProps extends ParentProps<ComponentProps<'div'>> {
  /** Animasi hover halus (y:-1) — default true. */
  hover?: boolean
}

export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ['hover', 'class'])

  const classes = () =>
    [
      'rounded-2xl border border-border bg-card text-card-foreground shadow-sm',
      local.hover !== false ? 'transition-shadow duration-200 hover:shadow-md' : '',
      local.class ?? '',
    ]
      .filter(Boolean)
      .join(' ')

  const motionProps =
    local.hover === false
      ? {}
      : { hover: { y: -1, transition: { duration: 0.15, easing: 'ease-out' } } as const }

  return <Motion tag="div" {...rest} class={classes()} {...motionProps} />
}

export function CardHeader(props: ParentProps<ComponentProps<'div'>>) {
  const [local, rest] = splitProps(props, ['class'])
  return <div {...rest} class={['flex flex-col gap-1 p-5 pb-3', local.class ?? ''].filter(Boolean).join(' ')} />
}

export function CardTitle(props: ParentProps<ComponentProps<'h3'>>) {
  const [local, rest] = splitProps(props, ['class'])
  return <h3 {...rest} class={['text-lg font-bold leading-tight text-foreground', local.class ?? ''].filter(Boolean).join(' ')} />
}

export function CardDescription(props: ParentProps<ComponentProps<'p'>>) {
  const [local, rest] = splitProps(props, ['class'])
  return <p {...rest} class={['text-sm text-muted-foreground', local.class ?? ''].filter(Boolean).join(' ')} />
}

export function CardContent(props: ParentProps<ComponentProps<'div'>>) {
  const [local, rest] = splitProps(props, ['class'])
  return <div {...rest} class={['p-5 pt-2', local.class ?? ''].filter(Boolean).join(' ')} />
}
