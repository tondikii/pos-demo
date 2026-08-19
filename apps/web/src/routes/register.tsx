import { createMemo, createSignal, Show } from 'solid-js'
import { A, Navigate, useNavigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { registerSchema } from '@larispos/shared'
import AuthLayout from '../layouts/AuthLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field, FormAlert } from '../components/ui/field'
import { Card, CardContent } from '../components/ui/card'
import { parseWithZod, type FieldErrors } from '../lib/validation'
import { useAuth } from '../lib/auth-mock'

type RegisterKeys = 'email' | 'phone' | 'password' | 'businessName'

/**
 * /register — daftar ringkas (PRD Flow 1): 1 form, nama bisnis + email +
 * password. WA opsional — collapsed di bawah tombol, bisa dilengkapi nanti.
 * Setelah daftar → langsung ke dashboard (outlet "Outlet Utama" otomatis).
 */
export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = createSignal<{
    email: string
    phone: string
    password: string
    businessName: string
  }>({ email: '', phone: '', password: '', businessName: '' })
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [formError, setFormError] = createSignal<string | null>(null)
  const [submitting, setSubmitting] = createSignal(false)
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})
  const [showPhone, setShowPhone] = createSignal(false)

  if (isAuthenticated()) return <Navigate href="/dashboard" />

  const fieldErrors = createMemo(() => {
    const errs = errors()
    const t = touched()
    const out: FieldErrors = {}
    for (const key of ['email', 'phone', 'password', 'businessName'] as const) {
      if (t[key] && errs[key]) out[key] = errs[key]
    }
    return out
  })

  function setField(key: RegisterKeys, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    if (touched()[key]) {
      const res = parseWithZod(registerSchema, { ...values(), [key]: value })
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

  function handleBlur(key: RegisterKeys) {
    setTouched((t) => ({ ...t, [key]: true }))
    const res = parseWithZod(registerSchema, values())
    if (!res.ok) setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const res = parseWithZod(registerSchema, values())
    if (!res.ok) {
      setErrors(res.errors ?? {})
      setTouched({ email: true, phone: true, password: true, businessName: true })
      return
    }

    setSubmitting(true)
    setFormError(null)
    window.setTimeout(() => {
      try {
        register(res.data)
        // Outlet "Outlet Utama" dibuat otomatis — langsung masuk dashboard.
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Daftar gagal. Coba lagi.')
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
        <Card>
          <CardContent class="p-6 sm:p-8">
            <div class="mb-6 space-y-1.5">
              <h1 class="text-2xl font-extrabold tracking-tight text-foreground">Coba gratis 14 hari</h1>
              <p class="text-sm text-muted-foreground">
                Tanpa kartu, tanpa kontrak. Sudah punya akun?{' '}
                <A href="/login" class="font-semibold text-primary hover:text-blue-700 hover:underline">
                  Masuk
                </A>
              </p>
            </div>

            <Show when={formError()}>
              <div class="mb-5">
                <FormAlert title={formError()!} />
              </div>
            </Show>

            <form onSubmit={handleSubmit} noValidate class="space-y-4">
              <Field label="Nama usaha" for="reg-business" required errorMessage={fieldErrors().businessName}>
                <Input
                  id="reg-business"
                  name="businessName"
                  autocomplete="organization"
                  placeholder="mis. Warung Ayam Geprek Sari"
                  value={values().businessName}
                  invalid={Boolean(fieldErrors().businessName)}
                  onInput={(e) => setField('businessName', e.currentTarget.value)}
                  onBlur={() => handleBlur('businessName')}
                />
              </Field>

              <Field label="Email" for="reg-email" required errorMessage={fieldErrors().email}>
                <Input
                  id="reg-email"
                  type="email"
                  name="email"
                  autocomplete="email"
                  inputmode="email"
                  placeholder="nama@usaha.id"
                  value={values().email}
                  invalid={Boolean(fieldErrors().email)}
                  onInput={(e) => setField('email', e.currentTarget.value)}
                  onBlur={() => handleBlur('email')}
                />
              </Field>

              <Field label="Password" for="reg-password" required errorMessage={fieldErrors().password} hint="Minimal 8 karakter">
                <Input
                  id="reg-password"
                  type="password"
                  name="password"
                  autocomplete="new-password"
                  placeholder="••••••••"
                  value={values().password}
                  invalid={Boolean(fieldErrors().password)}
                  onInput={(e) => setField('password', e.currentTarget.value)}
                  onBlur={() => handleBlur('password')}
                />
              </Field>

              {/* WA opsional — collapsed, dibuka hanya kalau mau diisi sekarang */}
              <Show
                when={showPhone()}
                fallback={
                  <button
                    type="button"
                    onClick={() => setShowPhone(true)}
                    class="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-foreground"
                  >
                    <span aria-hidden="true" class="text-base leading-none">＋</span>
                    Tambahkan nomor WA (opsional)
                  </button>
                }
              >
                <Field
                  label="Nomor WhatsApp (opsional)"
                  for="reg-phone"
                  errorMessage={fieldErrors().phone}
                  hint="Format Indonesia: 08xx / +62 8xx"
                >
                  <Input
                    id="reg-phone"
                    type="tel"
                    name="phone"
                    autocomplete="tel-national"
                    inputmode="tel"
                    placeholder="0812 3456 7890"
                    value={values().phone}
                    invalid={Boolean(fieldErrors().phone)}
                    onInput={(e) => setField('phone', e.currentTarget.value)}
                    onBlur={() => handleBlur('phone')}
                  />
                </Field>
              </Show>

              <Button type="submit" fullWidth size="lg" loading={submitting()}>
                {submitting() ? 'Membuat akun…' : 'Daftar & mulai trial'}
              </Button>
            </form>

            <p class="mt-4 text-center text-xs text-muted-foreground">
              Dengan mendaftar Anda menyetujui Syarat &amp; Ketentuan dan Kebijakan Privasi LarisPOS.
            </p>
          </CardContent>
        </Card>
      </Motion>
    </AuthLayout>
  )
}
