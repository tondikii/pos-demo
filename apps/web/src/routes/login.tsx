import { createMemo, createSignal, Show } from 'solid-js'
import { A, useNavigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { loginSchema } from '@larispos/shared'
import AuthLayout from '../layouts/AuthLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field, FormAlert } from '../components/ui/field'
import { Card, CardContent } from '../components/ui/card'
import { parseWithZod, type FieldErrors } from '../lib/validation'
import { useAuth } from '../lib/auth-mock'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = createSignal<{ email: string; password: string }>({ email: '', password: '' })
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [formError, setFormError] = createSignal<string | null>(null)
  const [submitting, setSubmitting] = createSignal(false)
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})

  // Sudah login → langsung ke onboarding/dashboard
  if (isAuthenticated()) navigate('/onboarding', { replace: true })

  const fieldErrors = createMemo(() => {
    const errs = errors()
    const t = touched()
    const out: FieldErrors = {}
    for (const key of ['email', 'password'] as const) {
      if (t[key] && errs[key]) out[key] = errs[key]
    }
    return out
  })

  function setField(key: 'email' | 'password', value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    // re-validate inline setelah field pernah disentuh
    if (touched()[key]) {
      const res = parseWithZod(loginSchema, { ...values(), [key]: value })
      setErrors((e) => (res.ok ? omitKey(e, key) : { ...e, ...(res.errors ?? {}) }))
    }
  }

  function omitKey(e: FieldErrors, key: string): FieldErrors {
    const out: FieldErrors = {}
    for (const k of Object.keys(e)) if (k !== key) out[k] = e[k]
    return out
  }

  function handleBlur(key: 'email' | 'password') {
    setTouched((t) => ({ ...t, [key]: true }))
    const res = parseWithZod(loginSchema, values())
    if (!res.ok) setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const res = parseWithZod(loginSchema, values())
    if (!res.ok) {
      setErrors(res.errors ?? {})
      setTouched({ email: true, password: true })
      return
    }

    setSubmitting(true)
    setFormError(null)
    // Mock — simulasi latensi singkat agar loading state terlihat nyata
    window.setTimeout(() => {
      try {
        login(res.data)
        navigate('/onboarding', { replace: true })
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Login gagal. Coba lagi.')
        setSubmitting(false)
      }
    }, 400)
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
              <h1 class="text-2xl font-extrabold tracking-tight text-foreground">Masuk ke dashboard</h1>
              <p class="text-sm text-muted-foreground">
                Belum punya akun?{' '}
                <A href="/register" class="font-semibold text-primary hover:text-blue-700 hover:underline">
                  Daftar gratis 14 hari
                </A>
              </p>
            </div>

            <Show when={formError()}>
              <div class="mb-5">
                <FormAlert title={formError()!} />
              </div>
            </Show>

            <form onSubmit={handleSubmit} noValidate class="space-y-4">
              <Field label="Email" for="login-email" required errorMessage={fieldErrors().email}>
                <Input
                  id="login-email"
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

              <Field label="Password" for="login-password" required errorMessage={fieldErrors().password}>
                <Input
                  id="login-password"
                  type="password"
                  name="password"
                  autocomplete="current-password"
                  placeholder="Minimal 8 karakter"
                  value={values().password}
                  invalid={Boolean(fieldErrors().password)}
                  onInput={(e) => setField('password', e.currentTarget.value)}
                  onBlur={() => handleBlur('password')}
                />
              </Field>

              <Button type="submit" fullWidth size="lg" loading={submitting()}>
                {submitting() ? 'Memeriksa…' : 'Masuk'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p class="mt-4 text-center text-xs text-muted-foreground">
          Fase 2 — mode demo. Data tersimpan lokal di browser Anda.
        </p>
      </Motion>
    </AuthLayout>
  )
}
