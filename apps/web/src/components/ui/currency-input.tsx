import { createSignal, onCleanup } from 'solid-js'
import type { ComponentProps } from 'solid-js'

export interface CurrencyInputProps
  extends Omit<ComponentProps<'input'>, 'onInput' | 'value' | 'type'> {
  /** Nilai numerik (Rupiah). */
  value: number
  /** Dipanggil dengan angka bersih (tanpa pemisah). */
  onValue: (value: number) => void
  /** Placeholder (mis. "0"). */
  placeholder?: string
  invalid?: boolean
}

/**
 * Input uang Rupiah dengan format ribuan otomatis saat mengetik:
 * "15000" → "15.000". Nilai disimpan sebagai number via onValue.
 * Saat kosong → 0. Koma/desimal tidak dipakai (Rupiah bulat).
 */
export function CurrencyInput(props: CurrencyInputProps) {
  const [text, setText] = createSignal(
    props.value > 0 ? new Intl.NumberFormat('id-ID').format(props.value) : '',
  )
  const [focused, setFocused] = createSignal(false)

  function formatRaw(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    return new Intl.NumberFormat('id-ID').format(Number(digits))
  }

  function handleInput(e: InputEvent) {
    const el = e.currentTarget as HTMLInputElement
    const digits = el.value.replace(/\D/g, '')
    const num = digits ? Number(digits) : 0
    setText(formatRaw(digits))
    props.onValue(num)
  }

  function handleFocus() {
    setFocused(true)
    // saat fokus, tampilkan angka polos untuk mudah diedit
    if (props.value > 0) setText(String(props.value))
  }

  function handleBlur() {
    setFocused(false)
    if (props.value > 0) setText(new Intl.NumberFormat('id-ID').format(props.value))
    else setText('')
  }

  onCleanup(() => {})

  return (
    <div class="relative">
      <span
        aria-hidden="true"
        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground"
      >
        Rp
      </span>
      <input
        {...props}
        type="text"
        inputmode="numeric"
        value={focused() ? (props.value > 0 ? String(props.value) : text()) : text()}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        class={[
          'h-11 w-full rounded-xl border bg-card pl-9 pr-3.5 text-sm text-foreground tabular-nums',
          'placeholder:text-muted-foreground/70',
          'transition-colors duration-150',
          props.invalid
            ? 'border-destructive focus-visible:border-destructive'
            : 'border-border hover:border-primary/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          props.class ?? '',
        ].join(' ')}
        aria-invalid={props.invalid || undefined}
      />
    </div>
  )
}
