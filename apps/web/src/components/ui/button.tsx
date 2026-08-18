import type { ComponentProps, ParentProps, JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import { Motion } from '@motionone/solid'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ParentProps<ComponentProps<'button'>> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Tampilkan spinner loading & nonaktifkan interaksi. */
  loading?: boolean
  fullWidth?: boolean
  children: JSX.Element
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-blue-700 focus-visible:bg-blue-700 border border-transparent',
  secondary:
    'bg-card text-foreground border-border hover:bg-muted border',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent',
  destructive:
    'bg-destructive text-on-destructive hover:bg-red-700 border border-transparent',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'loading',
    'fullWidth',
    'children',
    'disabled',
  ])

  const variant = () => local.variant ?? 'primary'
  const size = () => local.size ?? 'md'

  const classes = () =>
    [
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
      'cursor-pointer select-none whitespace-nowrap',
      'transition-colors duration-150',
      'disabled:cursor-not-allowed disabled:opacity-60',
      VARIANT_CLASSES[variant()],
      SIZE_CLASSES[size()],
      local.fullWidth ? 'w-full' : '',
      local.loading ? 'pointer-events-none opacity-80' : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <Motion tag="button"
      {...rest}
      type={rest.type ?? 'button'}
      disabled={local.disabled || local.loading}
      class={classes()}
      aria-busy={local.loading ? true : undefined}
      hover={{ y: -1, opacity: 0.94, transition: { duration: 0.15, easing: 'ease-out' } }}
      press={{ y: 0, opacity: 1, transition: { duration: 0.1, easing: 'ease-out' } }}
    >
      {local.loading ? (
        <span
          aria-hidden="true"
          class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {local.children}
    </Motion>
  )
}
