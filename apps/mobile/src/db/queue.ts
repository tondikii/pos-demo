import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import { db } from './client'
import { queuedTransactions, type QueueStatus } from './schema'

/**
 * Payload transaksi yang dikirim ke `POST /transactions` saat sync (Fase 3B.4).
 * Mirip `createTransactionSchema` di packages/shared + snapshot harga untuk struk.
 * Semua field snapshot (productName, variantName, sellPrice, costPrice) diambil
 * dari cache — server menyimpan snapshot di transaction_items agar struk/cetak
 * ulang tidak berubah walau harga berubah belakangan.
 */
export type QueuedTransactionPayload = {
  offlineId: string
  outletId: string
  staffId: string
  shiftId?: string | null
  paymentMethodId: string
  subtotal: number
  taxAmount: number
  serviceAmount: number
  total: number
  cashReceived?: number
  change?: number
  items: {
    productVariantId: string
    productName: string
    variantName: string
    sellPrice: number
    costPrice: number
    qty: number
    lineTotal: number
  }[]
  createdAt: number
  /**
   * Field void (Fase 2B.4) — hanya ada setelah transaksi di-void.
   * Mirror `transactions.status|voidReason` server (ARCHITECTURE.md §4.1).
   */
  status?: 'voided'
  voidReason?: string
  voidedAt?: number
}

/**
 * Info void yang disisipkan ke payload saat transaksi dibatalkan (Fase 2B.4).
 * Mirror field `transactions.status|voidReason` server (ARCHITECTURE.md §4.1)
 * — saat sync real, payload ini jadi dasar `POST /transactions/:id/void`.
 * `voidedAt` disimpan sebagai timestamp_ms (Date di DDL, angka di payload).
 */
export type VoidInfo = {
  status: 'voided'
  voidReason: string
  voidedAt: number
}

/** true jika payload sudah di-void (status 'voided' + metadata lengkap). */
export function isVoidedPayload(payload: QueuedTransactionPayload): boolean {
  return payload.status === 'voided' && typeof payload.voidedAt === 'number'
}

export type QueuedTxRow = typeof queuedTransactions.$inferSelect

/**
 * Simpan transaksi ke antrean offline — offline-first sejak awal.
 * `offlineId` di-generate client (crypto.randomUUID) sebagai idempotency key.
 */
export async function enqueueTransaction(payload: QueuedTransactionPayload): Promise<void> {
  await db.insert(queuedTransactions).values({
    offlineId: payload.offlineId,
    payload,
    status: 'pending',
    retries: 0,
    createdAt: new Date(payload.createdAt),
  })
}

/** Ambil antrean FIFO (createdAt ASC) dengan filter status. */
export async function getQueuedTransactions(
  status?: QueueStatus | QueueStatus[],
): Promise<QueuedTxRow[]> {
  const orderBy = [asc(queuedTransactions.createdAt)]
  if (!status) {
    return db.select().from(queuedTransactions).orderBy(...orderBy).all()
  }
  const statuses = Array.isArray(status) ? status : [status]
  if (statuses.length === 1) {
    return db
      .select()
      .from(queuedTransactions)
      .where(eq(queuedTransactions.status, statuses[0]))
      .orderBy(...orderBy)
      .all()
  }
  return db
    .select()
    .from(queuedTransactions)
    .where(inArray(queuedTransactions.status, statuses))
    .orderBy(...orderBy)
    .all()
}

/** Hapus dari antrean setelah sync sukses (200). */
export async function deleteQueuedTransaction(offlineId: string): Promise<void> {
  await db.delete(queuedTransactions).where(eq(queuedTransactions.offlineId, offlineId))
}

/** Tandai gagal — dipakai untuk 409 INSUFFICIENT_STOCK / retries habis. */
export async function markQueuedTransactionFailed(
  offlineId: string,
  error: string,
): Promise<void> {
  await db
    .update(queuedTransactions)
    .set({ status: 'failed', error, updatedAt: new Date() })
    .where(eq(queuedTransactions.offlineId, offlineId))
}

/** Naikkan retries saat POST gagal (bukan konflik stok) — backoff 2s/4s/8s. */
export async function bumpQueuedTransactionRetry(
  offlineId: string,
  maxRetries = 3,
): Promise<'pending' | 'failed'> {
  const rows = await db
    .select({ retries: queuedTransactions.retries })
    .from(queuedTransactions)
    .where(eq(queuedTransactions.offlineId, offlineId))
    .all()
  const current = rows[0]?.retries ?? 0
  if (current + 1 >= maxRetries) {
    await markQueuedTransactionFailed(offlineId, 'RETRIES_EXCEEDED')
    return 'failed'
  }
  await db
    .update(queuedTransactions)
    .set({ retries: current + 1, updatedAt: new Date() })
    .where(eq(queuedTransactions.offlineId, offlineId))
  return 'pending'
}

/** Kunci antrean transaksi yang mulai di-sync (status syncing) — cegah drain ganda. */
export async function claimQueuedTransaction(offlineId: string): Promise<boolean> {
  const result = await db
    .update(queuedTransactions)
    .set({ status: 'syncing', updatedAt: new Date() })
    .where(
      and(
        eq(queuedTransactions.offlineId, offlineId),
        eq(queuedTransactions.status, 'pending'),
      ),
    )
    .returning({ offlineId: queuedTransactions.offlineId })
    .all()
  return result.length > 0
}

/**
 * Recovery: kembalikan semua baris `syncing` → `pending` (dipanggil saat app
 * start / sync context init). Mencegah antrean macet selamanya jika proses
 * sync terputus di tengah (crash/kill) — baris syncing tidak pernah di-drain.
 */
export async function recoverStuckSyncing(): Promise<number> {
  const result = await db
    .update(queuedTransactions)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(queuedTransactions.status, 'syncing'))
    .returning({ offlineId: queuedTransactions.offlineId })
    .all()
  return result.length
}

/** Count per status — untuk badge "Menunggu sync" (Fase 2B.5). */
export async function getQueueStats(): Promise<Record<QueueStatus, number>> {
  const rows = await db
    .select({ status: queuedTransactions.status, count: sql<number>`count(*)` })
    .from(queuedTransactions)
    .where(sql`${queuedTransactions.status} != 'syncing'`)
    .groupBy(queuedTransactions.status)
    .all()
  const stats: Record<QueueStatus, number> = { pending: 0, syncing: 0, voided: 0, failed: 0 }
  for (const row of rows) {
    stats[row.status] = Number(row.count ?? 0)
  }
  return stats
}
