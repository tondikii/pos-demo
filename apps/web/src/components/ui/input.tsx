import type { ComponentProps, JSX } from 'solid-js'
import { splitProps } from 'solid-js'

export interface InputProps extends ComponentProps<'input'> {
  /** State error — border merah + ring lembut, dipasangkan dgn Field/aria-invalid. */
  invalid?: boolean
  /** Label terlihat (opsional, lebih baik pakai <Field>). */
  label?: string
  /** Pesan error inline, direferensikan lewat aria-describedby. */
  errorMessage?: string
}

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['invalid', 'label', 'errorMessage'])

  const invalid = () => local.invalid ?? Boolean(local.errorMessage)
  const errorId = () => (local.errorMessage ? rest.id ? `${rest.id}-error` : undefined : undefined)

  return (
    <div class="flex flex-col gap-1.5">
      {local.label ? (
        <label for={rest.id} class="text-sm font-medium text-foreground">
          {local.label}
        </label>
      ) : null}
      <input
        {...rest}
        aria-invalid={invalid() || undefined}
        aria-describedby={errorId()}
        class={[
          'h-11 w-full rounded-xl border bg-card px-3.5 text-sm text-foreground',
          'placeholder:text-muted-foreground/70',
          'transition-colors duration-150',
          invalid()
            ? 'border-destructive focus-visible:border-destructive'
            : 'border-border hover:border-primary/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          rest.class ?? '',
        ].join(' ')}
      />
      {local.errorMessage ? (
        <p id={errorId()} class="text-xs font-medium text-destructive" role="alert">
          {local.errorMessage}
        </p>
      ) : null}
    </div>
  )
}

export type { JSX }
