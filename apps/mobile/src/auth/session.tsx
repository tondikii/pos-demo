import * as storage from '../lib/secure-storage'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { DEMO_CASHIERS, DEMO_OUTLETS, type DemoCashier, type DemoOutlet } from '@larispos/shared'

const SESSION_KEY = 'larispos.session'

export type OutletInfo = DemoOutlet

export type SessionInfo = {
  id: string
  name: string
  role: 'cashier'
  outletId: string
  outletName: string
}

/** Outlet mock — Fase 2B.1 tanpa API. Sync dengan seed `packages/db` saat wiring. */
export const MOCK_OUTLETS: OutletInfo[] = DEMO_OUTLETS

/** Staff mock — outlet → list kasir (PIN plaintext hanya untuk mock Fase 2B.1). */
export const MOCK_CASHIERS: Record<string, { id: string; name: string; pin: string }[]> =
  Object.fromEntries(
    DEMO_OUTLETS.map((o) => [
      o.id,
      DEMO_CASHIERS.filter((c: DemoCashier) => c.outletId === o.id).map((c) => ({
        id: c.id,
        name: c.name,
        pin: c.pin,
      })),
    ]),
  )

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
    storage
      .getItemAsync(SESSION_KEY)
      .then((raw) => {
        if (!mounted || !raw) return
        try {
          const parsed = JSON.parse(raw) as SessionInfo
          if (parsed && typeof parsed.outletId === 'string' && typeof parsed.name === 'string') {
            setSession(parsed)
          } else {
            void storage.deleteItemAsync(SESSION_KEY)
          }
        } catch {
          void storage.deleteItemAsync(SESSION_KEY)
        }
      })
      .catch(() => {
        // storage error saat restore → anggap belum login
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const signIn = useCallback(async (info: SessionInfo) => {
    await storage.setItemAsync(SESSION_KEY, JSON.stringify(info))
    setSession(info)
  }, [])

  const signOut = useCallback(async () => {
    await storage.deleteItemAsync(SESSION_KEY).catch(() => {})
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
