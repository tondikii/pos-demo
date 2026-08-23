import { createEffect, createMemo, createSignal, Show } from 'solid-js'
import { createOutletSchema } from '@larispos/shared'
import type { CreateOutletInput } from '@larispos/shared'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'
import { parseWithZod, type FieldErrors } from '../lib/validation'
import type { MockSettingsOutlet } from '../lib/settings-mocks'

/* ------------------------------------------------------------------ */
/* Form state (string-based, mirip onboarding) + validasi Zod shared   */
/* ------------------------------------------------------------------ */

export interface OutletFormValues {
  name: string
  address: string
  phone: string
  taxPercent: string
  servicePercent: string
  receiptHeader: string
  receiptFooter: string
  isActive: boolean
}

const EMPTY_VALUES: OutletFormValues = {
  name: '',
  address: '',
  phone: '',
  taxPercent: '0',
  servicePercent: '0',
  receiptHeader: '',
  receiptFooter: '',
  isActive: true,
}

function toInput(v: OutletFormValues): CreateOutletInput {
  return {
    name: v.name.trim(),
    address: v.address.trim(),
    phone: v.phone.trim() === '' ? undefined : v.phone.trim(),
    taxPercent: v.taxPercent === '' ? 0 : Number(v.taxPercent),
    servicePercent: v.servicePercent === '' ? 0 : Number(v.servicePercent),
    receiptHeader: v.receiptHeader.trim() === '' ? undefined : v.receiptHeader.trim(),
    receiptFooter: v.receiptFooter.trim() === '' ? undefined : v.receiptFooter.trim(),
    isActive: v.isActive,
  }
}

export function formValuesFromOutlet(o: MockSettingsOutlet): OutletFormValues {
  return {
    name: o.name,
    address: o.address,
    phone: o.phone ?? '',
    taxPercent: String(o.taxPercent),
    servicePercent: String(o.servicePercent),
    receiptHeader: o.receiptHeader ?? '',
    receiptFooter: o.receiptFooter ?? '',
    isActive: o.isActive,
  }
}

/* ------------------------------------------------------------------ */
/* OutletFormModal                                                     */
/* ------------------------------------------------------------------ */

export interface OutletFormModalProps {
  open: boolean
  /** Outlet yang diedit — null = mode create. */
  outlet: MockSettingsOutlet | null
  submitting: boolean
  onClose: () => void
  onSubmit: (input: CreateOutletInput) => void
}

const FIELDS = [
  'name',
  'address',
  'phone',
  'taxPercent',
  'servicePercent',
  'receiptHeader',
  'receiptFooter',
] as const

type OutletField = (typeof FIELDS)[number]

export function OutletFormModal(props: OutletFormModalProps) {
  const [values, setValues] = createSignal<OutletFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})

  // Reset form setiap kali modal dibuka (create ataupun edit).
  createEffect(() => {
    if (props.open) {
      setValues(props.outlet ? formValuesFromOutlet(props.outlet) : EMPTY_VALUES)
      setErrors({})
      setTouched({})
    }
  })

  const isEdit = () => props.outlet !== null

  const fieldErrors = createMemo(() => {
    const errs = errors()
    const t = touched()
    const out: FieldErrors = {}
    for (const key of FIELDS) {
      if (t[key] && errs[key]) out[key] = errs[key]
    }
    return out
  })

  function setField(key: OutletField, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    if (touched()[key]) {
      const res = parseWithZod(createOutletSchema, toInput({ ...values(), [key]: value }))
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

  function handleBlur(key: OutletField) {
    setTouched((t) => ({ ...t, [key]: true }))
    const res = parseWithZod(createOutletSchema, toInput(values()))
    if (!res.ok) setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const res = parseWithZod<typeof createOutletSchema>(
      createOutletSchema,
      toInput(values()),
    )
    if (!res.ok) {
      setErrors(res.errors ?? {})
      setTouched(Object.fromEntries(FIELDS.map((k) => [k, true])))
      return
    }
    props.onSubmit(res.data)
  }

  return (
    <Show when={props.open}>
      <form onSubmit={handleSubmit} noValidate>
        <div class="space-y-4">
          <Field label="Nama outlet" for="of-name" required errorMessage={fieldErrors().name}>
            <Input
              id="of-name"
              name="name"
              placeholder="mis. Kopi Senja — Tebet"
              value={values().name}
              invalid={Boolean(fieldErrors().name)}
              onInput={(e) => setField('name', e.currentTarget.value)}
              onBlur={() => handleBlur('name')}
            />
          </Field>

          <Field label="Alamat" for="of-address" required errorMessage={fieldErrors().address}>
            <Input
              id="of-address"
              name="address"
              placeholder="Jalan, kelurahan, kota"
              value={values().address}
              invalid={Boolean(fieldErrors().address)}
              onInput={(e) => setField('address', e.currentTarget.value)}
              onBlur={() => handleBlur('address')}
            />
          </Field>

          <Field label="Nomor telepon outlet (opsional)" for="of-phone" errorMessage={fieldErrors().phone}>
            <Input
              id="of-phone"
              type="tel"
              name="phone"
              inputmode="tel"
              placeholder="021-… atau 08xx"
              value={values().phone}
              invalid={Boolean(fieldErrors().phone)}
              onInput={(e) => setField('phone', e.currentTarget.value)}
              onBlur={() => handleBlur('phone')}
            />
          </Field>

          <div class="grid grid-cols-2 gap-4">
            <Field
              label="Pajak %"
              for="of-tax"
              errorMessage={fieldErrors().taxPercent}
              hint="0–11%"
            >
              <Input
                id="of-tax"
                name="taxPercent"
                type="number"
                inputmode="decimal"
                min="0"
                max="11"
                step="0.5"
                placeholder="0"
                value={values().taxPercent}
                invalid={Boolean(fieldErrors().taxPercent)}
                onInput={(e) => setField('taxPercent', e.currentTarget.value)}
                onBlur={() => handleBlur('taxPercent')}
              />
            </Field>
            <Field
              label="Biaya layanan %"
              for="of-service"
              errorMessage={fieldErrors().servicePercent}
              hint="0–11%"
            >
              <Input
                id="of-service"
                name="servicePercent"
                type="number"
                inputmode="decimal"
                min="0"
                max="11"
                step="0.5"
                placeholder="0"
                value={values().servicePercent}
                invalid={Boolean(fieldErrors().servicePercent)}
                onInput={(e) => setField('servicePercent', e.currentTarget.value)}
                onBlur={() => handleBlur('servicePercent')}
              />
            </Field>
          </div>

          <Field
            label="Header struk (opsional)"
            for="of-receipt-header"
            errorMessage={fieldErrors().receiptHeader}
            hint="Pesan singkat di atas struk — maks 200 karakter"
          >
            <Input
              id="of-receipt-header"
              name="receiptHeader"
              maxLength={200}
              placeholder="mis. 'Terima kasih sudah belanja di sini!'"
              value={values().receiptHeader}
              invalid={Boolean(fieldErrors().receiptHeader)}
              onInput={(e) => setField('receiptHeader', e.currentTarget.value)}
              onBlur={() => handleBlur('receiptHeader')}
            />
          </Field>

          <Field
            label="Footer struk (opsional)"
            for="of-receipt-footer"
            errorMessage={fieldErrors().receiptFooter}
            hint="Pesan singkat di bawah struk — maks 300 karakter"
          >
            <Input
              id="of-receipt-footer"
              name="receiptFooter"
              maxLength={300}
              placeholder="mis. alamat IG / nomor yang bisa dihubungi"
              value={values().receiptFooter}
              invalid={Boolean(fieldErrors().receiptFooter)}
              onInput={(e) => setField('receiptFooter', e.currentTarget.value)}
              onBlur={() => handleBlur('receiptFooter')}
            />
          </Field>

          {/* Toggle aktif — hanya muncul saat edit (outlet baru selalu aktif). */}
          <Show when={isEdit()}>
            <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div>
                <p class="text-sm font-medium text-foreground">Outlet aktif</p>
                <p class="text-xs text-muted-foreground">
                  Outlet nonaktif tidak muncul di kasir &amp; laporan.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={values().isActive}
                aria-label="Status aktif outlet"
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
                : 'Tambah outlet'}
          </Button>
        </div>
      </form>
    </Show>
  )
}
