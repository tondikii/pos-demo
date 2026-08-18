import type { JSX, ParentProps } from 'solid-js'
import { splitProps } from 'solid-js'

export interface FieldProps extends ParentProps {
  label: string
  /** id input yang label ini rujuk. */
  for?: string
  /** Pesan error inline (role="alert", aria-describedby via Input). */
  errorMessage?: string
  /** Hint bantu (mis. format nomor WA). */
  hint?: string
  /** Tandai wajib — render asterisk merah kecil. */
  required?: boolean
  /** Elemen kontrol form. */
  children: JSX.Element
}

export function Field(props: FieldProps) {
  const [local] = splitProps(props, ['label', 'for', 'errorMessage', 'hint', 'required', 'children'])

  return (
    <div class="flex flex-col gap-1.5">
      <label for={local.for} class="text-sm font-medium text-foreground">
        {local.label}
        {local.required ? (
          <span aria-hidden="true" class="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </label>
      <div class="w-full">{local.children}</div>
      {local.errorMessage ? (
        <p id={local.for ? `${local.for}-error` : undefined} class="text-xs font-medium text-destructive" role="alert">
          {local.errorMessage}
        </p>
      ) : null}
      {local.hint ? <p class="text-xs text-muted-foreground">{local.hint}</p> : null}
    </div>
  )
}

/** FormAlert — ringkasan error di atas form (role="alert", bisa di-focus keyboard). */
export function FormAlert(props: ParentProps<{ title?: string }>) {
  return (
    <div
      role="alert"
      tabindex={-1}
      class="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {props.title ? <p class="font-semibold">{props.title}</p> : null}
      <div class="mt-1 space-y-0.5">{props.children}</div>
    </div>
  )
}
