import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { createStaffSchema, PIN_LENGTH } from '@larispos/shared'
import type { CreateStaffInput } from '@larispos/shared'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'
import { parseWithZod, type FieldErrors } from '../lib/validation'
import type { MockSettingsOutlet, MockStaff } from '../lib/settings-mocks'

/* ------------------------------------------------------------------ */
/* Form state + validasi Zod shared (PIN 6 digit)                      */
/* ------------------------------------------------------------------ */

export interface StaffFormValues {
  name: string
  outletId: string
  pin: string
  /** Konfirmasi PIN — divalidasi manual (harus sama dengan `pin`). */
  pinConfirm: string
}

function emptyValues(defaultOutletId: string): StaffFormValues {
  return { name: '', outletId: defaultOutletId, pin: '', pinConfirm: '' }
}

function toInput(v: StaffFormValues): CreateStaffInput {
  return {
    name: v.name.trim(),
    outletId: v.outletId,
    pin: v.pin,
  }
}

/* ------------------------------------------------------------------ */
/* StaffFormModal — create staff + PIN                                 */
/* ------------------------------------------------------------------ */

export interface StaffFormModalProps {
  open: boolean
  defaultOutletId: string
  /** Outlet yang bisa dipilih (staff di-assign ke salah satunya). */
  outlets: MockSettingsOutlet[]
  submitting: boolean
  onClose: () => void
  onSubmit: (input: CreateStaffInput) => void
}

const PIN_HINT = `PIN ${PIN_LENGTH} digit — dipakai kasir saat login aplikasi kasir.`

export function StaffFormModal(props: StaffFormModalProps) {
  const [values, setValues] = createSignal<StaffFormValues>(emptyValues(props.defaultOutletId))
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})

  // Reset form setiap kali modal dibuka.
  createEffect(() => {
    if (props.open) {
      setValues(emptyValues(props.defaultOutletId))
      setErrors({})
      setTouched({})
    }
  })

  const fieldErrors = createMemo(() => {
    const errs = errors()
    const t = touched()
    const out: FieldErrors = {}
    for (const key of ['name', 'outletId', 'pin', 'pinConfirm'] as const) {
      if (t[key] && errs[key]) out[key] = errs[key]
    }
    return out
  })

  /** Validasi penuh termasuk konfirmasi PIN (di luar schema shared). */
  function validateAll(v: StaffFormValues): FieldErrors {
    const res = parseWithZod(createStaffSchema, toInput(v))
    const errs: FieldErrors = { ...(res.errors ?? {}) }
    if (res.ok && v.pinConfirm !== v.pin) {
      errs.pinConfirm = 'Konfirmasi PIN tidak sama.'
    }
    if (v.pin === '' && v.pinConfirm === '') {
      delete errs.pin
      delete errs.pinConfirm
    }
    return errs
  }

  function setField(key: keyof StaffFormValues, value: string) {
    const next: StaffFormValues = { ...values(), [key]: value }
    setValues(next)
    if (touched()[key]) {
      const errs = validateAll(next)
      setErrors((e) => {
        const merged = { ...e }
        for (const k of Object.keys(merged)) {
          if (k === key || k === 'pinConfirm') delete merged[k]
        }
        return { ...merged, ...errs }
      })
    }
  }

  function handleBlur(key: keyof StaffFormValues) {
    setTouched((t) => ({ ...t, [key]: true }))
    setErrors((e) => ({ ...e, ...validateAll(values()) }))
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const errs = validateAll(values())
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTouched({ name: true, outletId: true, pin: true, pinConfirm: true })
      return
    }
    props.onSubmit(toInput(values()))
  }

  return (
    <Show when={props.open}>
      <form onSubmit={handleSubmit} noValidate>
        <div class="space-y-4">
          <Field label="Nama staff" for="sf-name" required errorMessage={fieldErrors().name}>
            <Input
              id="sf-name"
              name="name"
              placeholder="mis. Budi Santoso"
              value={values().name}
              invalid={Boolean(fieldErrors().name)}
              onInput={(e) => setField('name', e.currentTarget.value)}
              onBlur={() => handleBlur('name')}
            />
          </Field>

          <Field label="Outlet" for="sf-outlet" required errorMessage={fieldErrors().outletId}>
            <select
              id="sf-outlet"
              name="outletId"
              value={values().outletId}
              onChange={(e) => setField('outletId', e.currentTarget.value)}
              class={[
                'h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3.5 text-sm text-foreground',
                'transition-colors duration-150 hover:border-primary/40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              ].join(' ')}
            >
              <For each={props.outlets}>
                {(o) => <option value={o.id}>{o.name}</option>}
              </For>
            </select>
          </Field>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="PIN kasir"
              for="sf-pin"
              required
              errorMessage={fieldErrors().pin}
              hint={PIN_HINT}
            >
              <Input
                id="sf-pin"
                name="pin"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                maxLength={PIN_LENGTH}
                placeholder="••••••"
                value={values().pin}
                invalid={Boolean(fieldErrors().pin)}
                onInput={(e) => setField('pin', e.currentTarget.value.replace(/\D/g, ''))}
                onBlur={() => handleBlur('pin')}
              />
            </Field>
            <Field
              label="Ulangi PIN"
              for="sf-pin-confirm"
              required
              errorMessage={fieldErrors().pinConfirm}
            >
              <Input
                id="sf-pin-confirm"
                name="pinConfirm"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                maxLength={PIN_LENGTH}
                placeholder="••••••"
                value={values().pinConfirm}
                invalid={Boolean(fieldErrors().pinConfirm)}
                onInput={(e) => setField('pinConfirm', e.currentTarget.value.replace(/\D/g, ''))}
                onBlur={() => handleBlur('pinConfirm')}
              />
            </Field>
          </div>

          <p class="rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            PIN disimpan sebagai hash (tidak bisa dibaca siapa pun). Staff login di aplikasi
            kasir memakai PIN ini — jangan bagikan ke orang lain.
          </p>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => props.onClose()}>
            Batal
          </Button>
          <Button type="submit" loading={props.submitting}>
            {props.submitting ? 'Menambahkan…' : 'Tambah staff'}
          </Button>
        </div>
      </form>
    </Show>
  )
}

/* ------------------------------------------------------------------ */
/* ResetStaffPinModal — reset PIN staff (6 digit baru)                 */
/* ------------------------------------------------------------------ */

export interface ResetStaffPinModalProps {
  open: boolean
  /** Staff yang PIN-nya di-reset. */
  staff: MockStaff | null
  submitting: boolean
  onClose: () => void
  onSubmit: (pin: string) => void
}

export function ResetStaffPinModal(props: ResetStaffPinModalProps) {
  const [pin, setPin] = createSignal('')
  const [confirm, setConfirm] = createSignal('')
  const [errors, setErrors] = createSignal<FieldErrors>({})

  createEffect(() => {
    if (props.open) {
      setPin('')
      setConfirm('')
      setErrors({})
    }
  })

  function validate(p: string, c: string): FieldErrors {
    const errs: FieldErrors = {}
    if (!/^\d{6}$/.test(p)) errs.pin = `PIN harus ${PIN_LENGTH} digit angka.`
    if (c !== p) errs.pinConfirm = 'Konfirmasi PIN tidak sama.'
    return errs
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const errs = validate(pin(), confirm())
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    props.onSubmit(pin())
  }

  return (
    <Show when={props.open}>
      <form onSubmit={handleSubmit} noValidate>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Reset PIN untuk <span class="font-semibold text-foreground">{props.staff?.name}</span>.
          PIN baru langsung berlaku di aplikasi kasir.
        </p>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="PIN baru"
            for="rp-pin"
            required
            errorMessage={errors().pin}
            hint={PIN_HINT}
          >
            <Input
              id="rp-pin"
              type="password"
              inputmode="numeric"
              autocomplete="new-password"
              maxLength={PIN_LENGTH}
              placeholder="••••••"
              value={pin()}
              invalid={Boolean(errors().pin)}
              onInput={(e) => setPin(e.currentTarget.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field
            label="Ulangi PIN"
            for="rp-pin-confirm"
            required
            errorMessage={errors().pinConfirm}
          >
            <Input
              id="rp-pin-confirm"
              type="password"
              inputmode="numeric"
              autocomplete="new-password"
              maxLength={PIN_LENGTH}
              placeholder="••••••"
              value={confirm()}
              invalid={Boolean(errors().pinConfirm)}
              onInput={(e) => setConfirm(e.currentTarget.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>
        <div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => props.onClose()}>
            Batal
          </Button>
          <Button type="submit" loading={props.submitting}>
            {props.submitting ? 'Menyimpan…' : 'Reset PIN'}
          </Button>
        </div>
      </form>
    </Show>
  )
}
