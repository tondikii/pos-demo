import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate, useNavigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { createOutletSchema, PLANS, TRIAL_DAYS } from '@larispos/shared'
import type { CreateOutletInput } from '@larispos/shared'
import AuthLayout from '../layouts/AuthLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field, FormAlert } from '../components/ui/field'
import { Card, CardContent } from '../components/ui/card'
import { parseWithZod, type FieldErrors } from '../lib/validation'
import { useAuth } from '../lib/auth-mock'

const STEP_LABELS = ['Akun', 'Outlet', 'Selesai'] as const

const STEP_FIELDS = [
  'name',
  'address',
  'phone',
  'taxPercent',
  'servicePercent',
  'receiptHeader',
  'receiptFooter',
] as const

type OutletField = (typeof STEP_FIELDS)[number]

interface OutletFormValues {
  name: string
  address: string
  phone: string
  taxPercent: string
  servicePercent: string
  receiptHeader: string
  receiptFooter: string
}

const EMPTY_VALUES: OutletFormValues = {
  name: '',
  address: '',
  phone: '',
  taxPercent: '0',
  servicePercent: '0',
  receiptHeader: '',
  receiptFooter: '',
}

function toInput(v: OutletFormValues): CreateOutletInput {
  return {
    name: v.name,
    address: v.address,
    phone: v.phone.trim() === '' ? undefined : v.phone,
    taxPercent: v.taxPercent === '' ? 0 : Number(v.taxPercent),
    servicePercent: v.servicePercent === '' ? 0 : Number(v.servicePercent),
    receiptHeader: v.receiptHeader.trim() === '' ? undefined : v.receiptHeader,
    receiptFooter: v.receiptFooter.trim() === '' ? undefined : v.receiptFooter,
    isActive: true,
  }
}

function StepBar(props: { current: number }) {
  return (
    <ol class="flex items-center gap-2" aria-label="Langkah onboarding">
      <For each={STEP_LABELS}>
        {(label, i) => {
          const step = i() + 1
          const active = step === props.current
          const done = step < props.current
          return (
            <li class="flex flex-1 items-center gap-2">
              <span
                class={[
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-150',
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-primary text-on-primary'
                      : 'bg-muted text-muted-foreground',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                {done ? '✓' : step}
              </span>
              <span
                class={[
                  'hidden text-xs font-medium sm:block',
                  active ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {label}
              </span>
              {step < STEP_LABELS.length ? <span aria-hidden="true" class="h-px flex-1 bg-border" /> : null}
            </li>
          )
        }}
      </For>
    </ol>
  )
}

export default function OnboardingPage() {
  const { user, outlet, isAuthenticated, createOutlet, logout } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = createSignal(1)

  // Guard: wajib sudah register/login dulu
  if (!isAuthenticated()) return <Navigate href="/register" />

  // Sudah punya outlet → lompat ke dashboard
  if (outlet()) return <Navigate href="/dashboard" />

  const [values, setValues] = createSignal<OutletFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [formError, setFormError] = createSignal<string | null>(null)
  const [submitting, setSubmitting] = createSignal(false)
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})

  const plan = PLANS.starter
  const trialEnd = createMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + TRIAL_DAYS)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  })

  const fieldErrors = createMemo(() => {
    const errs = errors()
    const t = touched()
    const out: FieldErrors = {}
    for (const key of STEP_FIELDS) {
      if (t[key] && errs[key]) out[key] = errs[key]
    }
    return out
  })

  function setField(key: OutletField, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    // re-validate inline setelah field pernah disentuh
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
    const res = parseWithZod(createOutletSchema, toInput(values()))
    if (!res.ok) {
      setErrors(res.errors ?? {})
      setTouched(Object.fromEntries(STEP_FIELDS.map((k) => [k, true])))
      return
    }
    setSubmitting(true)
    setFormError(null)
    window.setTimeout(() => {
      try {
        createOutlet({ ...res.data, taxPercent: res.data.taxPercent ?? 0, servicePercent: res.data.servicePercent ?? 0 })
        setStep(3)
        setSubmitting(false)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Gagal menyimpan outlet.')
        setSubmitting(false)
      }
    }, 500)
  }

  return (
    <AuthLayout>
      <Motion tag="div"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, easing: 'ease-out' }}
      >
        <StepBar current={step()} />

        <div class="mt-6">
          <Show when={step() === 1}>
            <Card>
              <CardContent class="p-6 sm:p-8">
                <h1 class="text-2xl font-extrabold tracking-tight text-foreground">
                  Halo, {user()?.businessName ?? 'sahabat usaha'} 👋
                </h1>
                <p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Akun Anda siap. Trial gratis{' '}
                  <span class="font-semibold text-foreground">{TRIAL_DAYS} hari</span> aktif otomatis
                  (paket <span class="font-semibold text-foreground">{plan.label}</span>,{' '}
                  <span class="font-semibold text-foreground">{plan.maxOutlets} outlet</span>) hingga{' '}
                  <span class="font-semibold text-foreground">{trialEnd()}</span>. Sekarang buat
                  outlet pertama Anda.
                </p>
                <div class="mt-6 flex items-center justify-between gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      logout()
                      navigate('/register', { replace: true })
                    }}
                  >
                    Keluar
                  </Button>
                  <Button onClick={() => setStep(2)}>Lanjut — buat outlet</Button>
                </div>
              </CardContent>
            </Card>
          </Show>

          <Show when={step() === 2}>
            <Card>
              <CardContent class="p-6 sm:p-8">
                <div class="mb-6 space-y-1.5">
                  <h1 class="text-2xl font-extrabold tracking-tight text-foreground">
                    Buat outlet pertama
                  </h1>
                  <p class="text-sm text-muted-foreground">
                    Informasi ini muncul di struk &amp; laporan. Bisa diubah nanti.
                  </p>
                </div>

                <Show when={formError()}>
                  <div class="mb-5">
                    <FormAlert title={formError()!} />
                  </div>
                </Show>

                <form onSubmit={handleSubmit} noValidate class="space-y-4">
                  <Field label="Nama outlet" for="out-name" required errorMessage={fieldErrors().name}>
                    <Input
                      id="out-name"
                      name="name"
                      placeholder="mis. Gerai Geprek Sari — Pasar Baru"
                      value={values().name}
                      invalid={Boolean(fieldErrors().name)}
                      onInput={(e) => setField('name', e.currentTarget.value)}
                      onBlur={() => handleBlur('name')}
                    />
                  </Field>

                  <Field label="Alamat" for="out-address" required errorMessage={fieldErrors().address}>
                    <Input
                      id="out-address"
                      name="address"
                      placeholder="Jalan, kelurahan, kota"
                      value={values().address}
                      invalid={Boolean(fieldErrors().address)}
                      onInput={(e) => setField('address', e.currentTarget.value)}
                      onBlur={() => handleBlur('address')}
                    />
                  </Field>

                  <Field
                    label="Nomor telepon outlet (opsional)"
                    for="out-phone"
                    errorMessage={fieldErrors().phone}
                  >
                    <Input
                      id="out-phone"
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
                      label="Pajak % (opsional)"
                      for="out-tax"
                      errorMessage={fieldErrors().taxPercent}
                      hint="0–11%"
                    >
                      <Input
                        id="out-tax"
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
                      label="Biaya layanan % (opsional)"
                      for="out-service"
                      errorMessage={fieldErrors().servicePercent}
                      hint="0–11%"
                    >
                      <Input
                        id="out-service"
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
                    for="out-receipt-header"
                    errorMessage={fieldErrors().receiptHeader}
                    hint="mis. 'Terima kasih sudah belanja di sini!'"
                  >
                    <Input
                      id="out-receipt-header"
                      name="receiptHeader"
                      maxLength={200}
                      placeholder="Pesan singkat di atas struk"
                      value={values().receiptHeader}
                      invalid={Boolean(fieldErrors().receiptHeader)}
                      onInput={(e) => setField('receiptHeader', e.currentTarget.value)}
                      onBlur={() => handleBlur('receiptHeader')}
                    />
                  </Field>

                  <Field
                    label="Footer struk (opsional)"
                    for="out-receipt-footer"
                    errorMessage={fieldErrors().receiptFooter}
                    hint="mis. alamat IG / nomor yang bisa dihubungi"
                  >
                    <Input
                      id="out-receipt-footer"
                      name="receiptFooter"
                      maxLength={300}
                      placeholder="Pesan singkat di bawah struk"
                      value={values().receiptFooter}
                      invalid={Boolean(fieldErrors().receiptFooter)}
                      onInput={(e) => setField('receiptFooter', e.currentTarget.value)}
                      onBlur={() => handleBlur('receiptFooter')}
                    />
                  </Field>

                  <div class="flex items-center justify-between gap-3 pt-2">
                    <Button variant="secondary" onClick={() => setStep(1)}>
                      Kembali
                    </Button>
                    <Button type="submit" loading={submitting()}>
                      {submitting() ? 'Menyimpan…' : 'Simpan outlet'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </Show>

          <Show when={step() === 3}>
            <Card>
              <CardContent class="p-6 text-center sm:p-8">
                <div
                  aria-hidden="true"
                  class="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl"
                >
                  ✅
                </div>
                <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
                  Outlet berhasil dibuat!
                </h1>
                <p class="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  <span class="font-semibold text-foreground">{outlet()?.name}</span> siap dipakai.
                  Berikutnya: tambahkan produk, metode bayar, dan undang kasir.
                </p>
                <Button class="mt-6" size="lg" onClick={() => navigate('/dashboard', { replace: true })}>
                  Masuk ke dashboard →
                </Button>
              </CardContent>
            </Card>
          </Show>
        </div>
      </Motion>
    </AuthLayout>
  )
}
