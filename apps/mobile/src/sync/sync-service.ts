import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'

import {
  bumpQueuedTransactionRetry,
  claimQueuedTransaction,
  deleteQueuedTransaction,
  getQueueStats,
  getQueuedTransactions,
  type QueuedTxRow,
} from '../db/queue'

/**
 * Mock sync engine — Fase 2B.5 (TANPA API asli).
 *
 * Mensimulasikan `POST /transactions` (ARCHITECTURE.md §11): antrean lokal
 * `queued_transactions` drained FIFO saat online. Pengganti nanti (Fase 3B.4)
 * cukup mengganti `mockPostTransaction` dengan Eden Treaty call — kontrak
 * (offlineId idempotency key, claim → delete saat 200, markFailed saat
 * 409/retries habis) sudah identik dengan `queue.ts`.
 */

/** RNG deterministik per proses untuk simulasi 10% network failure. */
let mockRng: (() => number) | null = null
export function __setMockRng(rng: () => number): void {
  mockRng = rng
}

function nextRandom(): number {
  return mockRng ? mockRng() : Math.random()
}

const NETWORK_FAILURE_RATE = 0.1
const MAX_RETRIES = 3
const SIMULATED_DELAY_MIN_MS = 800
const SIMULATED_DELAY_MAX_MS = 1500

export type SyncEventType =
  | 'started'
  | 'item-start'
  | 'item-success'
  | 'item-failed'
  | 'item-failed-permanent'
  | 'completed'
  | 'cancelled'

export type SyncEvent =
  | { type: 'started'; total: number }
  | { type: 'item-start'; offlineId: string; index: number; total: number }
  | { type: 'item-success'; offlineId: string }
  | { type: 'item-failed'; offlineId: string; error: string }
  | { type: 'item-failed-permanent'; offlineId: string; error: string }
  | { type: 'completed'; synced: number; failed: number; total: number }
  | { type: 'cancelled'; total: number }

export type SyncReport = {
  ok: boolean
  synced: number
  failed: number
  total: number
  cancelled: boolean
}

export type SyncStatus = {
  online: boolean
  pendingCount: number
  syncingCount: number
  failedCount: number
}

/**
 * Delay acak 800–1500ms per item — simulasi latensi jaringan.
 * Tidak dipakai saat reduced-motion: durasi tetap (mock tetap realistis).
 */
function simulateNetworkDelay(): Promise<void> {
  const ms =
    SIMULATED_DELAY_MIN_MS +
    Math.floor(nextRandom() * (SIMULATED_DELAY_MAX_MS - SIMULATED_DELAY_MIN_MS + 1))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock `POST /transactions` — sukses kecuali retries sudah >= MAX_RETRIES
 * (→ failed permanen) atau random 10% network failure (→ bumpRetry + pending).
 */
async function mockPostTransaction(row: QueuedTxRow): Promise<'ok' | 'network' | 'permanent'> {
  await simulateNetworkDelay()

  if (row.retries >= MAX_RETRIES) return 'permanent'

  if (nextRandom() < NETWORK_FAILURE_RATE) {
    return 'network'
  }

  // TODO Fase 3B.4: panggil `POST /transactions` via Eden Treaty dengan body
  // row.payload (offlineId = idempotency key). 200 → delete; 409
  // INSUFFICIENT_STOCK → markQueuedTransactionFailed (drain berhenti).
  return 'ok'
}

export type SyncProgressListener = (event: SyncEvent) => void

let activeRun: {
  token: number
  cancelled: boolean
} | null = null

function isRunCurrent(token: number): boolean {
  return activeRun !== null && activeRun.token === token && !activeRun.cancelled
}

/**
 * Sync antrean pending sekarang (FIFO). Tanpa API — simulasi mock:
 * - claim per item (status → syncing) mencegah drain ganda.
 * - retries >= 3 → failed permanen (badge Failed, tidak di-drain lagi).
 * - random 10% network failure → bumpRetry (tetap pending, ikut batch berikutnya).
 * - 200 → delete baris dari antrean.
 *
 * Satu item gagal TIDAK menghentikan drain — item lain tetap dicoba
 * (backoff 2s/4s/8s mengikuti `bumpQueuedTransactionRetry` di batch berikutnya).
 * Mengembalikan { cancel, promise } supaya UI bisa membatalkan run.
 */
export function syncNow(
  onEvent: SyncProgressListener = () => {},
): { cancel: () => void; promise: Promise<SyncReport> } {
  if (activeRun !== null) {
    return { cancel: () => {}, promise: Promise.resolve({ ok: false, synced: 0, failed: 0, total: 0, cancelled: true }) }
  }

  const token = Date.now() + Math.floor(Math.random() * 1_000_000)
  const run = { token, cancelled: false }
  activeRun = run

  const cancel = (): void => {
    run.cancelled = true
  }

  const promise = (async (): Promise<SyncReport> => {
    let synced = 0
    let failed = 0
    try {
      const pending = await getQueuedTransactions('pending')
      if (pending.length === 0) {
        onEvent({ type: 'completed', synced: 0, failed: 0, total: 0 })
        return { ok: true, synced: 0, failed: 0, total: 0, cancelled: false }
      }

      onEvent({ type: 'started', total: pending.length })

      for (let i = 0; i < pending.length; i++) {
        if (!isRunCurrent(token)) {
          onEvent({ type: 'cancelled', total: pending.length - i })
          return { ok: false, synced, failed, total: pending.length, cancelled: true }
        }

        const row = pending[i]
        // Claim: pending → syncing (gagal → item sudah berpindah status, skip).
        const claimed = await claimQueuedTransaction(row.offlineId)
        if (!claimed) continue

        onEvent({ type: 'item-start', offlineId: row.offlineId, index: i, total: pending.length })

        const result = await mockPostTransaction(row)
        if (!isRunCurrent(token)) {
          onEvent({ type: 'cancelled', total: pending.length - i })
          return { ok: false, synced, failed, total: pending.length, cancelled: true }
        }

        if (result === 'ok') {
          await deleteQueuedTransaction(row.offlineId)
          synced += 1
          onEvent({ type: 'item-success', offlineId: row.offlineId })
        } else if (result === 'permanent') {
          await bumpQueuedTransactionRetry(row.offlineId, MAX_RETRIES)
          failed += 1
          onEvent({ type: 'item-failed-permanent', offlineId: row.offlineId, error: 'RETRIES_EXCEEDED' })
        } else {
          await bumpQueuedTransactionRetry(row.offlineId, MAX_RETRIES)
          onEvent({ type: 'item-failed', offlineId: row.offlineId, error: 'NETWORK_FAILURE' })
        }
      }

      onEvent({ type: 'completed', synced, failed, total: pending.length })
      return { ok: failed === 0, synced, failed, total: pending.length, cancelled: false }
    } catch {
      onEvent({ type: 'cancelled', total: 0 })
      return { ok: false, synced, failed, total: 0, cancelled: true }
    } finally {
      if (activeRun?.token === token) {
        activeRun = null
      }
    }
  })()

  return { cancel, promise }
}

/** Batalkan run berjalan (dipakai saat provider unmount / logout). */
export function cancelActiveSync(): void {
  if (activeRun) {
    activeRun.cancelled = true
    activeRun = null
  }
}

/** Statistik antrean untuk badge & screen sync (count per status). */
export async function getSyncStatus(): Promise<SyncStatus> {
  const stats = await getQueueStats()
  return {
    online: true, // nilai asli di-set oleh SyncProvider via NetInfo
    pendingCount: stats.pending,
    syncingCount: stats.syncing,
    failedCount: stats.failed,
  }
}

/**
 * NetInfo listener stub → online/offline real (Fase 2B.5).
 * - online → auto-trigger sync (di-debounce oleh SyncProvider).
 * - Nilai awal dari NetInfo.fetch().
 */
export async function fetchNetInfoState(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    return state.isConnected !== false && state.isInternetReachable !== false
  } catch {
    return true // NetInfo error → anggap online (tidak menghalangi kasir)
  }
}

export function subscribeNetInfo(
  handler: (online: boolean) => void,
): () => void {
  return NetInfo.addEventListener((state: NetInfoState) => {
    handler(state.isConnected !== false && state.isInternetReachable !== false)
  })
}
