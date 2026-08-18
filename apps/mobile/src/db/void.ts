import { eq, sql } from 'drizzle-orm'

import { db } from './client'
import { queuedTransactions, shifts, variantsCache } from './schema'
import {
  isVoidedPayload,
  type QueuedTransactionPayload,
  type VoidInfo,
} from './queue'

/**
 * Void transaksi lokal — Fase 2B.4 (mock, TANPA API).
 * Mirror `POST /transactions/:id/void` server (ARCHITECTURE.md §4.1/§6):
 * payload diberi `status: 'voided' + voidReason + voidedAt`, stok varian
 * dikembalikan (restore qty), dan baris antrean tidak dihapus — tetap
 * tampil di History sebagai riwayat dengan badge Voided.
 *
 * Aturan bisnis (PRD §10.x / task 2B.4):
 * - Hanya transaksi `pending`/`syncing` yang bisa di-void.
 * - Transaksi `failed` TIDAK bisa di-void (batal di sisi sync, bukan di kasir).
 * - Void hanya untuk transaksi di shift yang MASIH BUKA (`shifts.status = 'open'`).
 * - Idempotent: offlineId yang sudah void → dikembalikan sukses (no-op).
 *
 * Seluruh operasi (cek status → update payload → restore stok) dibungkus
 * SATU transaksi SQLite sinkron (drizzle expo-sqlite) — atomic: jika salah
 * satu gagal, ROLLBACK, tidak ada stok yang ter-restore separuh.
 */

export type VoidErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_VOIDED'
  | 'FAILED'
  | 'SHIFT_REQUIRED'
  | 'SHIFT_CLOSED'
  | 'REASON_REQUIRED'
  | 'DB_ERROR'

export type VoidResult =
  | { ok: true; voidedAt: number }
  | { ok: false; error: string; code: VoidErrorCode }

export function voidErrorMessage(code: VoidErrorCode, fallback: string): string {
  switch (code) {
    case 'NOT_FOUND':
      return 'Transaksi tidak ditemukan.'
    case 'ALREADY_VOIDED':
      return 'Transaksi ini sudah di-void.'
    case 'FAILED':
      return 'Transaksi gagal tidak bisa di-void.'
    case 'SHIFT_REQUIRED':
      return 'Transaksi tidak terhubung ke shift — void tidak diizinkan.'
    case 'SHIFT_CLOSED':
      return 'Shift sudah ditutup. Void hanya bisa dilakukan saat shift masih berjalan.'
    case 'REASON_REQUIRED':
      return 'Alasan void wajib diisi.'
    case 'DB_ERROR':
      return 'Gagal memproses void. Coba lagi.'
    default:
      return fallback
  }
}

/**
 * Void transaksi dengan alasan. Atomic (transaksi SQLite tunggal):
 * validasi → tandai voided (row + payload) → restore stok variants_cache.
 */
export async function voidTransaction(
  offlineId: string,
  reason: string,
): Promise<VoidResult> {
  const trimmed = reason.trim()
  if (!trimmed) {
    return { ok: false, error: voidErrorMessage('REASON_REQUIRED', ''), code: 'REASON_REQUIRED' }
  }

  try {
    return db.transaction<VoidResult>((tx) => {
      // --- 1. Ambil & validasi baris transaksi (di dalam transaksi DB) ---
      const rows = tx
        .select()
        .from(queuedTransactions)
        .where(eq(queuedTransactions.offlineId, offlineId))
        .all()
      const row = rows[0]
      if (!row) {
        return { ok: false, error: voidErrorMessage('NOT_FOUND', ''), code: 'NOT_FOUND' }
      }

      const payload = row.payload as QueuedTransactionPayload

      // Sudah void → idempotent sukses (no-op), jangan restore stok 2x.
      if (row.status === 'voided' || isVoidedPayload(payload)) {
        return {
          ok: true,
          voidedAt: typeof payload.voidedAt === 'number' ? payload.voidedAt : Date.now(),
        }
      }

      // Transaksi failed tidak bisa void.
      if (row.status === 'failed') {
        return { ok: false, error: voidErrorMessage('FAILED', ''), code: 'FAILED' }
      }

      // Hanya transaksi di shift yang MASIH BUKA.
      if (!payload.shiftId) {
        return { ok: false, error: voidErrorMessage('SHIFT_REQUIRED', ''), code: 'SHIFT_REQUIRED' }
      }
      const shiftRows = tx
        .select({ status: shifts.status })
        .from(shifts)
        .where(eq(shifts.id, payload.shiftId))
        .all()
      const shift = shiftRows[0]
      if (!shift || shift.status !== 'open') {
        return { ok: false, error: voidErrorMessage('SHIFT_CLOSED', ''), code: 'SHIFT_CLOSED' }
      }

      // --- 2. Tandai voided: status baris + payload (mirror server) ---
      const voidedAt = Date.now()
      const voidInfo: VoidInfo = { status: 'voided', voidReason: trimmed, voidedAt }
      tx.update(queuedTransactions)
        .set({
          status: 'voided',
          payload: { ...payload, ...voidInfo },
          updatedAt: new Date(),
        })
        .where(eq(queuedTransactions.offlineId, offlineId))
        .run()

      // --- 3. Kembalikan stok varian (restore qty) — di transaksi yang sama ---
      for (const item of payload.items) {
        tx.update(variantsCache)
          .set({
            stock: sql`${variantsCache.stock} + ${item.qty}`,
            updatedAt: new Date(),
          })
          .where(eq(variantsCache.id, item.productVariantId))
          .run()
      }

      return { ok: true, voidedAt }
    })
  } catch {
    // Transaksi SQLite ROLLBACK otomatis — tidak ada stok ter-restore separuh.
    return { ok: false, error: voidErrorMessage('DB_ERROR', ''), code: 'DB_ERROR' }
  }
}

/** Metadata void dari payload (untuk UI: badge, alasan, waktu). */
export function getVoidMeta(payload: QueuedTransactionPayload): {
  voidReason: string
  voidedAt: number
} | null {
  if (payload.status !== 'voided') return null
  const voidedAt = payload.voidedAt
  if (typeof voidedAt !== 'number') return null
  return {
    voidReason: typeof payload.voidReason === 'string' ? payload.voidReason : '-',
    voidedAt,
  }
}
