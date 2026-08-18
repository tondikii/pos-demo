import * as SecureStore from 'expo-secure-store'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const SESSION_KEY = 'larispos.session'

export type OutletInfo = {
  id: string
  name: string
  address: string
}

export type SessionInfo = {
  id: string
  name: string
  role: 'cashier'
  outletId: string
  outletName: string
}

/** Outlet mock — Fase 2B.1 tanpa API. Sync dengan seed `packages/db` saat wiring. */
export const MOCK_OUTLETS: OutletInfo[] = [
  {
    id: 'b6f5c8a1-2d3e-4f5a-9b8c-7d6e5f4a3b21',
    name: 'Warung Demo Pusat',
    address: 'Jl. Merdeka No. 1, Jakarta',
  },
  {
    id: 'c7a6d9b2-3e4f-5a6b-8c9d-0e1f2a3b4c32',
    name: 'Cabang Tebet',
    address: 'Jl. Tebet Raya No. 45, Jakarta Selatan',
  },
]

/** Staff mock — outlet → list kasir (PIN plaintext hanya untuk mock Fase 2B.1). */
export const MOCK_CASHIERS: Record<string, { id: string; name: string; pin: string }[]> = {
  [MOCK_OUTLETS[0].id]: [{ id: 'stf-demo-pusat', name: 'Budi Kasir', pin: '123456' }],
  [MOCK_OUTLETS[1].id]: [{ id: 'stf-demo-tebet', name: 'Sari Kasir', pin: '123456' }],
}

export function findCashierByPin(
  outletId: string,
  pin: string,
): { id: string; name: string } | null {
  const staff = MOCK_CASHIERS[outletId] ?? []
  const match = staff.find((s) => s.pin === pin)
  return match ? { id: match.id, name: match.name } : null
}

type SessionContextValue = {
  session: SessionInfo | null
  isLoading: boolean
  signIn: (info: SessionInfo) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    SecureStore.getItemAsync(SESSION_KEY)
      .then((raw) => {
        if (!mounted || !raw) return
        try {
          const parsed = JSON.parse(raw) as SessionInfo
          if (parsed && typeof parsed.outletId === 'string' && typeof parsed.name === 'string') {
            setSession(parsed)
          } else {
            void SecureStore.deleteItemAsync(SESSION_KEY)
          }
        } catch {
          void SecureStore.deleteItemAsync(SESSION_KEY)
        }
      })
      .catch(() => {
        // secure-store error saat restore → anggap belum login
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const signIn = useCallback(async (info: SessionInfo) => {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(info))
    setSession(info)
  }, [])

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {})
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut }),
    [session, isLoading, signIn, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession harus dipakai di dalam <SessionProvider>')
  return ctx
}
