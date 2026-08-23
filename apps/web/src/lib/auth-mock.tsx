import {
  createContext,
  createMemo,
  createSignal,
  useContext,
  type JSX,
  type ParentProps,
} from 'solid-js'
import type { z } from 'zod'
import {
  createOutletSchema,
  loginSchema,
  registerSchema,
} from '@larispos/shared'
import type { LoginInput, RegisterInput } from '@larispos/shared'

const STORAGE_KEY = 'larispos_mock_auth'
/** Daftar akun terdaftar (mock) — logout TIDAK menghapus akun, hanya sesi. */
const ACCOUNTS_KEY = 'larispos_mock_accounts'

/** Akun tersimpan: user + outlet yang dibuat saat daftar (PRD Flow 1). */
export interface MockAccount {
  user: MockUser
  outlet: MockOutlet
}

/** Bentuk outlet hasil parse Zod — field default/opsional tetap opsional. */
export type MockOutlet = z.output<typeof createOutletSchema> & {
  id: string
  createdAt: string
}

export interface MockUser {
  id: string
  role: 'owner'
  createdAt: string
  email: string
  businessName: string
  /** WA opsional (PRD Flow 1) — dilengkapi via pengaturan nanti. */
  phone?: string
  /** Mock-only: password disimpan plaintext untuk login demo (Fase 3 → bcrypt hash server). */
  password?: string
}

export interface MockSession {
  user: MockUser
  outlet: MockOutlet | null
}

export type MockAuthLogin = LoginInput
export type MockAuthRegister = RegisterInput
export type MockAuthCreateOutlet = z.output<typeof createOutletSchema>

export interface MockAuthContextValue {
  /** Current user — null saat belum login. */
  user: () => MockUser | null
  /** Outlet aktif (tidak null setelah onboarding). */
  outlet: () => MockOutlet | null
  /** True selama sesi mock tersimpan (sudah login). */
  isAuthenticated: () => boolean
  register: (input: MockAuthRegister) => MockUser
  login: (input: MockAuthLogin) => MockUser
  createOutlet: (input: MockAuthCreateOutlet) => MockOutlet
  logout: () => void
}

const MockAuthContext = createContext<MockAuthContextValue>()

function safeParseSession(raw: string | null): MockSession | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { user: MockUser; outlet: MockOutlet | null }
    if (!parsed || typeof parsed !== 'object' || !parsed.user) return null
    return { user: parsed.user, outlet: parsed.outlet ?? null }
  } catch {
    return null
  }
}

function makeId(prefix: string): string {
  // UUID v4 — schema shared (createProduct/Staff/PaymentMethod) mewajibkan
  // `z.string().uuid()`, dan PK tabel DB adalah uuid. Prefix dibuang supaya
  // id tetap UUID valid; identitas sesi cukup disimpan di `id` saja.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  void prefix
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Outlet "Outlet Utama" otomatis dari nama bisnis (PRD Flow 1). */
function buildDefaultOutlet(user: MockUser): MockOutlet {
  return {
    id: makeId('out'),
    name: `${user.businessName} — Outlet Utama`,
    address: '',
    phone: user.phone,
    taxPercent: 0,
    servicePercent: 0,
    receiptHeader: undefined,
    receiptFooter: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
}

function loadAccounts(): MockAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as MockAccount[]
  } catch {
    return []
  }
}

function saveAccounts(accounts: MockAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // kuota penuh / private mode — abaikan
  }
}

/**
 * AuthMockProvider — state autentikasi Fase 2 (tanpa API).
 * Sesi dipersist di localStorage (`larispos_mock_auth`).
 * Validasi memakai Zod dari `@larispos/shared`; output mock mengikuti
 * bentuk tabel `users`/`outlets` di packages/db.
 */
export function AuthMockProvider(props: ParentProps): JSX.Element {
  const [session, setSession] = createSignal<MockSession | null>(
    safeParseSession(localStorage.getItem(STORAGE_KEY)),
  )

  const user = createMemo(() => session()?.user ?? null)
  const outlet = createMemo(() => session()?.outlet ?? null)
  const isAuthenticated = createMemo(() => session() !== null)

  function persist(next: MockSession | null) {
    setSession(next)
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const value: MockAuthContextValue = {
    user,
    outlet,
    isAuthenticated,
    register(input: MockAuthRegister): MockUser {
      registerSchema.parse(input) // throw → handled oleh caller via parseWithZod
      const userRow: MockUser = {
        ...input,
        phone: input.phone?.trim() ? input.phone : undefined,
        password: input.password, // mock-only login demo
        id: makeId('usr'),
        role: 'owner',
        createdAt: new Date().toISOString(),
      }
      // PRD Flow 1 — daftar 1 form: outlet dibuat otomatis dari nama bisnis
      // (pajak 0). Tidak ada step onboarding wajib.
      const outletRow = buildDefaultOutlet(userRow)
      // simpan akun + outlet (bisa login lagi setelah logout — outlet yang
      // sama dipakai ulang, bukan dibuat baru tiap login).
      const accounts = loadAccounts()
      const rest = accounts.filter((a) => a.user.email.toLowerCase() !== userRow.email.toLowerCase())
      saveAccounts([...rest, { user: userRow, outlet: outletRow }])
      persist({ user: userRow, outlet: outletRow })
      return userRow
    },
    login(input: MockAuthLogin): MockUser {
      loginSchema.parse(input)
      const accounts = loadAccounts()
      const account = accounts.find(
        (a) => a.user.email.toLowerCase() === input.email.trim().toLowerCase(),
      )
      if (!account || account.user.password !== input.password) {
        throw new Error('Email atau password salah.')
      }
      const sessionUser: MockUser = { ...account.user }
      // Outlet TETAP dari akun (tidak dibuat ulang) — pengaturan outlet yang
      // sudah dibuat sebelumnya tidak ter-orphan.
      const outletRow: MockOutlet = account.outlet ?? buildDefaultOutlet(sessionUser)
      persist({ user: sessionUser, outlet: outletRow })
      return sessionUser
    },
    createOutlet(input: MockAuthCreateOutlet): MockOutlet {
      createOutletSchema.parse(input)
      const current = session()
      if (!current) throw new Error('Silakan login/daftar terlebih dahulu.')
      const outletRow: MockOutlet = { ...input, id: makeId('out'), createdAt: new Date().toISOString() }
      persist({ user: current.user, outlet: outletRow })
      return outletRow
    },
    logout() {
      persist(null)
    },
  }

  return <MockAuthContext.Provider value={value}>{props.children}</MockAuthContext.Provider>
}

export function useAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthMockProvider>.')
  return ctx
}

/** Type helper: infer output Zod dari schema shared (hasil parse). */
export type RegisterResult = z.infer<typeof registerSchema>
export type LoginResult = z.infer<typeof loginSchema>
export type CreateOutletResult = z.infer<typeof createOutletSchema>
