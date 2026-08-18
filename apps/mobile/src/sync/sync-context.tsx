import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  cancelActiveSync,
  fetchNetInfoState,
  getSyncStatus,
  subscribeNetInfo,
  syncNow,
  type SyncEvent,
  type SyncReport,
} from './sync-service'
import { recoverStuckSyncing } from '../db/queue'

/**
 * SyncProvider — Fase 2B.5 (mock sync UI).
 *
 * State sync global untuk header POS + screen sync:
 * - `isOnline` dari NetInfo real, bisa di-override manual (toggle mock offline).
 * - Count pending/syncing/failed refresh tiap 3 detik + setelah event sync
 *   (item selesai/gagal) supaya badge langsung update tanpa menunggu interval.
 * - Auto-sync saat online: debounce 1.5s, di-trigger tiap kali `pendingCount`
 *   berubah (termasuk transisi offline → online). Drain yang sudah berjalan
 *   tidak ditumpuk (runRef). Setelah drain, sisa pending (network failure
 *   random 10%) di-retry dengan backoff 2 detik (mock — ARCHITECTURE §11:
 *   backoff 2s/4s/8s; di mock cukup 2s karena retries bertambah tiap upaya).
 *
 * `toggleOffline` hanya meng-override deteksi NetInfo (simulasi mock) — tidak
 * menyentuh koneksi perangkat. Semua operasi read-only terhadap antrean
 * (drain tetap satu-satunya jalur tulis dari `syncNow`).
 */

const SYNC_REFRESH_INTERVAL_MS = 3000
const AUTO_SYNC_DEBOUNCE_MS = 1500
const RETRY_BACKOFF_MS = 2000

type SyncContextValue = {
  isOnline: boolean
  pendingCount: number
  syncingCount: number
  failedCount: number
  /** true saat ada drain berjalan (untuk ikon spin). */
  isSyncing: boolean
  /** progress saat ini (0..1) — dipakai progress bar di screen sync. */
  progress: number
  /** true jika mode simulasi manual aktif (override NetInfo). */
  isOverrideActive: boolean
  syncNow: () => Promise<SyncReport>
  toggleOffline: () => void
  /** reset override manual → kembali ikuti NetInfo real. */
  resetOverride: () => void
  /** force refresh count (dipanggil screen sync saat ada item dihapus). */
  refresh: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [netOnline, setNetOnline] = useState(true) // deteksi NetInfo real
  const [override, setOverride] = useState<boolean | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncingCount, setSyncingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [progress, setProgress] = useState(0)

  const isOnline = override ?? netOnline
  const isOverrideActive = override !== null

  // Ref sinkron untuk callback async (toggle & auto-retry membaca nilai terkini).
  const isOnlineRef = useRef(isOnline)
  isOnlineRef.current = isOnline

  // ----- baca statistik antrean -----
  const refreshStats = useCallback(async () => {
    try {
      const s = await getSyncStatus()
      setPendingCount(s.pendingCount)
      setSyncingCount(s.syncingCount)
      setFailedCount(s.failedCount)
    } catch {
      // SQLite error sesaat — biarkan nilai lama.
    }
  }, [])

  // ----- mock sync engine -----
  const runRef = useRef<{ cancel: () => void } | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSync = useCallback(async (): Promise<SyncReport> => {
    // Sudah ada drain → tidak mulai lagi (syncNow juga idempotent di service).
    if (runRef.current) return { ok: false, synced: 0, failed: 0, total: 0, cancelled: true }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    setIsSyncing(true)
    const { cancel, promise } = syncNow((event: SyncEvent) => {
      switch (event.type) {
        case 'started':
          setProgress(0)
          break
        case 'item-start':
          if (event.total > 0) setProgress(event.index / event.total)
          break
        case 'item-success':
        case 'item-failed':
        case 'item-failed-permanent':
          // item-start berikutnya (index+1) akan majukan progress; refresh count
          // supaya badge langsung update tanpa menunggu interval 3 detik.
          void refreshStats()
          break
        case 'completed':
          setProgress(1)
          break
        default:
          break
      }
    })
    runRef.current = { cancel }

    const report = await promise
    setProgress(1)
    runRef.current = null
    setIsSyncing(false)

    // Sisa pending (network failure 10%) → retry backoff 2s selama masih online.
    const s = await getSyncStatus().catch(() => null)
    if (s) {
      setPendingCount(s.pendingCount)
      setSyncingCount(s.syncingCount)
      setFailedCount(s.failedCount)
      if (report.cancelled) return report
      if (s.pendingCount > 0 && isOnlineRef.current && !runRef.current) {
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null
          void runSync()
        }, RETRY_BACKOFF_MS)
      }
    }
    return report
  }, [refreshStats])

  const handleSyncNow = useCallback((): Promise<SyncReport> => {
    return runSync()
  }, [runSync])

  // ----- toggle offline/online (simulasi mock) -----
  // Balik state efektif saat ini: online → offline, offline → online.
  const toggleOffline = useCallback(() => {
    setOverride((prev) => {
      const currentOnline = prev === null ? isOnlineRef.current : prev
      return !currentOnline
    })
  }, [])

  const resetOverride = useCallback(() => setOverride(null), [])

  // ----- NetInfo listener real + fetch awal -----
  useEffect(() => {
    let mounted = true
    // Recovery: baris syncing yang tersisa dari run sebelumnya → pending lagi
    void recoverStuckSyncing()
    void fetchNetInfoState().then((online) => {
      if (mounted) setNetOnline(online)
    })
    const unsubscribe = subscribeNetInfo((online) => {
      if (mounted) setNetOnline(online)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // ----- auto-sync saat online (debounce; baca status fresh dari SQLite) -----
  useEffect(() => {
    if (!isOnline) return
    if (runRef.current) return // drain berjalan — jangan tumpuk

    const timer = setTimeout(() => {
      void getSyncStatus().then((s) => {
        if (s.pendingCount > 0) {
          void runSync()
        } else {
          void refreshStats()
        }
      })
    }, AUTO_SYNC_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [isOnline, pendingCount, refreshStats, runSync])

  // ----- interval refresh count (3 detik) + cleanup saat unmount -----
  useEffect(() => {
    const id = setInterval(() => {
      void refreshStats()
    }, SYNC_REFRESH_INTERVAL_MS)
    return () => {
      clearInterval(id)
      cancelActiveSync()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [refreshStats])

  const value = useMemo<SyncContextValue>(
    () => ({
      isOnline,
      pendingCount,
      syncingCount,
      failedCount,
      isSyncing,
      progress,
      isOverrideActive,
      syncNow: handleSyncNow,
      toggleOffline,
      resetOverride,
      refresh: refreshStats,
    }),
    [
      isOnline,
      isOverrideActive,
      pendingCount,
      syncingCount,
      failedCount,
      isSyncing,
      progress,
      handleSyncNow,
      toggleOffline,
      resetOverride,
      refreshStats,
    ],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync harus dipakai di dalam <SyncProvider>')
  return ctx
}
