import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { paymentMethodSchema, FLOW_STATUSES } from '@larispos/shared'
import type { PaymentType } from '../lib/settings-mocks'
import type { MockPaymentMethod } from '../lib/settings-mocks'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'
import { parseWithZod, type FieldErrors } from '../lib/validation'

/* ------------------------------------------------------------------ */
/* Form state + validasi Zod shared (paymentMethodSchema)              */
/* ------------------------------------------------------------------ */

export interface PaymentMethodFormValues {
  name: string
  type: PaymentType
  instruction: string
  isActive: boolean
}

const EMPTY_VALUES: PaymentMethodFormValues = {
  name: '',
  type: 'non_cash',
  instruction: '',
  isActive: true,
}

export function formValuesFromMethod(m: MockPaymentMethod): PaymentMethodFormValues {
  return {
    name: m.name,
    type: m.type,
    instruction: m.instruction ?? '',
    isActive: m.isActive,
  }
}

/* ------------------------------------------------------------------ */
/* PaymentMethodFormModal — create/edit metode bayar                   */
/* ------------------------------------------------------------------ */

export interface PaymentMethodFormModalProps {
  open: boolean
  /** Metode yang diedit — null = mode create. */
  method: MockPaymentMethod | null
  submitting: boolean
  onClose: () => void
  onSubmit: (input: {
    name: string
    type: PaymentType
    instruction?: string
    isActive: boolean
  }) => void
}

const FIELDS = ['name', 'instruction'] as const
type MethodField = (typeof FIELDS)[number]

export function PaymentMethodFormModal(props: PaymentMethodFormModalProps) {
  const [values, setValues] = createSignal<PaymentMethodFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})

  // Reset form setiap kali modal dibuka.
  createEffect(() => {
    if (props.open) {
      setValues(props.method ? formValuesFromMethod(props.method) : EMPTY_VALUES)
      setErrors({})
      setTouched({})
    }
  })

  const isEdit = () => props.method !== null

  const fieldErrors = createMemo(() => {
    const errs = errors()
    const t = touched()
    const out: FieldErrors = {}
    for (const key of FIELDS) {
      if (t[key] && errs[key]) out[key] = errs[key]
    }
    return out
  })

  function setField(key: MethodField, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    if (touched()[key]) {
      const res = parseWithZod(paymentMethodSchema, toInput({ ...values(), [key]: value }))
      if (res.ok) {
        setErrors((e) => {
          const next = { ...e }
          delete next[key]
          return next
        })
      } else {
        setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
      }
    }
  }

  function handleBlur(key: MethodField) {
    setTouched((t) => ({ ...t, [key]: true }))
    const res = parseWithZod(paymentMethodSchema, toInput(values()))
    if (!res.ok) setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const res = parseWithZod<typeof paymentMethodSchema>(
      paymentMethodSchema,
      toInput(values()),
    )
    if (!res.ok) {
      setErrors(res.errors ?? {})
      setTouched({ name: true, instruction: true })
      return
    }
    props.onSubmit(res.data)
  }

  function toInput(v: PaymentMethodFormValues) {
    return {
      name: v.name.trim(),
      type: v.type,
      instruction: v.instruction.trim() === '' ? undefined : v.instruction.trim(),
      isActive: v.isActive,
    }
  }

  return (
    <Show when={props.open}>
      <form onSubmit={handleSubmit} noValidate>
        <div class="space-y-4">
          <Field label="Nama metode" for="pm-name" required errorMessage={fieldErrors().name}>
            <Input
              id="pm-name"
              name="name"
              placeholder="mis. QRIS, GoPay, Transfer Bank…"
              value={values().name}
              invalid={Boolean(fieldErrors().name)}
              onInput={(e) => setField('name', e.currentTarget.value)}
              onBlur={() => handleBlur('name')}
            />
          </Field>

          <Field label="Tipe" for="pm-type" required>
            <select
              id="pm-type"
              name="type"
              value={values().type}
              onChange={(e) =>
                setValues((v) => ({ ...v, type: e.currentTarget.value as PaymentType }))
              }
              class={[
                'h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3.5 text-sm text-foreground',
                'transition-colors duration-150 hover:border-primary/40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              ].join(' ')}
            >
              <For each={FLOW_STATUSES.paymentMethodType}>
                {(t) => (
                  <option value={t}>
                    {t === 'cash' ? 'Cash (tunai)' : 'Non-cash (QRIS / transfer / e-wallet)'}
                  </option>
                )}
              </For>
            </select>
          </Field>

          <Field
            label="Instruksi pembayaran (opsional)"
            for="pm-instruction"
            errorMessage={fieldErrors().instruction}
            hint="Tampil di struk — mis. nomor rekening / QRIS"
          >
            <Input
              id="pm-instruction"
              name="instruction"
              maxLength={300}
              placeholder="mis. Transfer ke BCA 1234567890 a.n. LarisPOS"
              value={values().instruction}
              invalid={Boolean(fieldErrors().instruction)}
              onInput={(e) => setField('instruction', e.currentTarget.value)}
              onBlur={() => handleBlur('instruction')}
            />
          </Field>

          {/* Toggle aktif — hanya saat edit (metode baru selalu aktif). */}
          <Show when={isEdit()}>
            <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div>
                <p class="text-sm font-medium text-foreground">Metode aktif</p>
                <p class="text-xs text-muted-foreground">
                  Metode nonaktif tidak muncul di kasir. Minimal 1 metode harus aktif.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={values().isActive}
                aria-label="Status aktif metode bayar"
                onClick={() => setValues((v) => ({ ...v, isActive: !v.isActive }))}
                class={[
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150',
                  values().isActive ? 'bg-primary' : 'bg-muted',
                ].join(' ')}
              >
                <span
                  class={[
                    'inline-block size-4 rounded-full bg-white shadow transition-transform duration-150',
                    values().isActive ? 'translate-x-6' : 'translate-x-1',
                  ].join(' ')}
                />
              </button>
            </div>
          </Show>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => props.onClose()}>
            Batal
          </Button>
          <Button type="submit" loading={props.submitting}>
            {props.submitting
              ? isEdit()
                ? 'Menyimpan…'
                : 'Menambahkan…'
              : isEdit()
                ? 'Simpan perubahan'
                : 'Tambah metode'}
          </Button>
        </div>
      </form>
    </Show>
  )
}
