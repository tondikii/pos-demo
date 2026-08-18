import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { db } from './client'
import { MOCK_PAYMENT_METHODS } from '../lib/mock-data'
import { queuedTransactions, shifts, type ShiftStatus } from './schema'
import { summarizeShiftTransactions, type ShiftTxSummary } from './shift-types'
import type { QueuedTransactionPayload } from './queue'

/**
 * Shift kas lokal (Fase 2B.3, mock, TANPA API) — PRD §10.7.
 *
 * Aturan bisnis yang di-mirror:
 * - 1 shift open per kasir per outlet (partial unique index di schema).
 * - expectedCash = openingCash + cash masuk (transaksi cash) − void.
 *   Void Fase 2B.4 belum ada → komponen void = 0 di mock ini; formula
 *   tetap eksplisit biar migrasi ke server (Fase 3A.7) tinggal isi.
 * - difference = actualCash − expectedCash (positive = lebih, negative = kurang).
 * - Auto-close 03:00: PRD edge case — shift yang lupa ditutup dianggap tutup
 *   jam 03:00 dengan catatan. Di sini `getActiveShift()` menandai shift open
 *   yang openedAt sudah lewat pukul 03:00 sebagai "auto-closed" (read-only
 *   view; closedAt dicatat sebagai 03:00 hari tersebut) dan menerbitkan
 *   `autoClosedNote` untuk UI. Server Fase 3.7 punya job terpisah.
 */

const AUTO_CLOSE_HOUR = 3 // 03:00 WIB — PRD edge case

export type ShiftRow = typeof shifts.$inferSelect

export type ShiftTxSummaryByShift = {
  summary: ShiftTxSummary
  /** Ringkasan baris mentah per transaksi (untuk expand/audit). */
  transactions: QueuedTransactionPayload[]
}

export type ActiveShiftView = {
  shift: ShiftRow
  /** Transaksi dalam shift (dari antrean) — snapshot payload lengkap. */
  transactions: QueuedTransactionPayload[]
  summary: ShiftTxSummary
  /** true jika shift ini auto-ditutup jam 03:00 karena lupa tutup (PRD). */
  autoClosed: boolean
  /** Catatan untuk UI saat auto-closed. */
  autoClosedNote: string | null
}

function isAutoCloseEligible(shift: ShiftRow): boolean {
  if (shift.status !== 'open') return false
  const d = new Date(shift.openedAt)
  // Shift dianggap "lupa tutup" HANYA jika dibuka SEBELUM jam 03:00 dan
  // sekarang sudah melewati jam 03:00 (hari berikutnya). Shift yang dibuka
  // jam 03:00+ tidak langsung di-auto-close.
  if (d.getHours() >= AUTO_CLOSE_HOUR) return false
  const now = new Date()
  const autoCloseToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    AUTO_CLOSE_HOUR,
    0,
    0,
    0,
  )
  return now.getTime() >= autoCloseToday.getTime()
}

/** Tanggal "03:00 hari ini" untuk catatan auto-close. */
function autoCloseTimestamp(shift: ShiftRow): number {
  const d = new Date(shift.openedAt)
  const closed = new Date(d.getFullYear(), d.getMonth(), d.getDate(), AUTO_CLOSE_HOUR, 0, 0, 0)
  return closed.getTime()
}

/**
 * Ambil rekap transaksi shift dari antrean lokal.
 * Range waktu = [openedAt, closedAt ?? now]; status `failed` dikeluarkan
 * (transaksi batal/stok habis — bukan omzet). Void (Fase 2B.4) akan
 * mengoreksi expectedCash; mock ini belum ada void.
 */
export async function getShiftTransactions(shift: ShiftRow): Promise<ShiftTxSummaryByShift> {
  const rows = await db
    .select({ payload: queuedTransactions.payload })
    .from(queuedTransactions)
    .where(inArray(queuedTransactions.status, ['pending', 'syncing']))
    .orderBy(asc(queuedTransactions.createdAt))
    .all()

  const to = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now()
  const openedAtMs = new Date(shift.openedAt).getTime()
  const payloads = rows
    .map((r) => r.payload as QueuedTransactionPayload)
    .filter((p) => p.createdAt >= openedAtMs && p.createdAt <= to)

  const methodNames = Object.fromEntries(MOCK_PAYMENT_METHODS.map((m) => [m.id, m.name]))
  const methodTypes = Object.fromEntries(MOCK_PAYMENT_METHODS.map((m) => [m.id, m.type]))
  const summary = summarizeShiftTransactions(payloads, methodNames, methodTypes)

  return { summary, transactions: payloads }
}

/**
 * Shift open aktif untuk outlet+staff — dengan rekap transaksi.
 * Bonus PRD edge case: shift open yang melewati jam 03:00 dianggap auto-closed
 * (ditampilkan sebagai riwayat, bukan "aktif"); catatan dibawa ke UI.
 */
export async function getActiveShift(outletId: string, staffId: string): Promise<ActiveShiftView | null> {
  const rows = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.outletId, outletId), eq(shifts.staffId, staffId)))
    .orderBy(desc(shifts.openedAt))
    .limit(20)
    .all()

  // Shift open TERBARU untuk staff+outlet ini (partial unique menjamin maks 1).
  const open = rows.find((s) => s.status === 'open')

  if (open && isAutoCloseEligible(open)) {
    const { summary, transactions } = await getShiftTransactions(open)
    const closedAt = autoCloseTimestamp(open)
    const autoClosed: ShiftRow = {
      ...open,
      status: 'closed',
      actualCash: null,
      difference: null,
      closedAt: new Date(closedAt),
    }
    return {
      shift: autoClosed,
      transactions,
      summary,
      autoClosed: true,
      autoClosedNote: `Shift otomatis ditutup jam 03:00 (lupa tutup). Dihitung s/d ${new Date(closedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
    }
  }

  if (!open) return null

  const { summary, transactions } = await getShiftTransactions(open)
  return { shift: open, transactions, summary, autoClosed: false, autoClosedNote: null }
}

/**
 * Buka shift baru. Gagal jika masih ada shift open untuk outlet+staff ini
 * (PRD: 1 open per kasir per outlet) — cek manual + partial unique index
 * sebagai jaring pengaman ganda.
 */
export async function openShift(
  outletId: string,
  staffId: string,
  openingCash: number,
): Promise<{ ok: true; shift: ShiftRow } | { ok: false; error: string }> {
  const cash = Math.max(0, Math.round(openingCash))
  const existing = await getActiveShift(outletId, staffId)
  if (existing && existing.shift.status === 'open') {
    return { ok: false, error: 'Masih ada shift yang sedang berjalan untuk kasir ini.' }
  }

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const now = new Date()
  const inserted = await db
    .insert(shifts)
    .values({
      id,
      outletId,
      staffId,
      openingCash: cash,
      expectedCash: cash, // expected dihitung ulang saat close
      status: 'open',
      openedAt: now,
      createdAt: now,
    })
    .returning()
    .all()

  const shift = inserted[0]
  if (!shift) return { ok: false, error: 'Gagal membuka shift.' }

  const { summary } = await getShiftTransactions(shift)
  await db
    .update(shifts)
    .set({ expectedCash: cash + summary.cashTotal, updatedAt: new Date() })
    .where(eq(shifts.id, shift.id))
    .all()

  return { ok: true, shift: { ...shift, expectedCash: cash + summary.cashTotal } }
}

/**
 * Tutup shift: hitung expectedCash (opening + cash masuk − void) lalu
 * selisih terhadap kas aktual. Hanya shift open milik outlet+staff ini.
 */
export async function closeShift(
  id: string,
  outletId: string,
  staffId: string,
  actualCash: number,
): Promise<{ ok: true; shift: ShiftRow; summary: ShiftTxSummary } | { ok: false; error: string }> {
  const rows = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.id, id), eq(shifts.outletId, outletId), eq(shifts.staffId, staffId)))
    .all()
  const shift = rows[0]
  if (!shift) return { ok: false, error: 'Shift tidak ditemukan.' }
  if (shift.status !== 'open') return { ok: false, error: 'Shift sudah ditutup.' }

  const actual = Math.max(0, Math.round(actualCash))
  const { summary } = await getShiftTransactions(shift)
  const expected = Math.round(shift.openingCash + summary.cashTotal) // − void (0 di mock)
  const difference = actual - expected

  const updated = await db
    .update(shifts)
    .set({
      expectedCash: expected,
      actualCash: actual,
      difference,
      status: 'closed',
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(shifts.id, id))
    .returning()
    .all()

  const closed = updated[0]
  if (!closed) return { ok: false, error: 'Gagal menutup shift.' }
  return { ok: true, shift: closed, summary }
}

/**
 * Riwayat shift (semua status, outlet ini), terbaru dulu — dengan rekap
 * transaksi masing-masing untuk detail di UI.
 */
export async function getShiftHistory(
  outletId: string,
  staffId?: string,
): Promise<(ShiftRow & ShiftTxSummaryByShift)[]> {
  const conditions = [eq(shifts.outletId, outletId)]
  if (staffId) conditions.push(eq(shifts.staffId, staffId))

  const rows = await db
    .select()
    .from(shifts)
    .where(and(...conditions))
    .orderBy(desc(shifts.openedAt))
    .limit(30)
    .all()

  return Promise.all(
    rows.map(async (shift) => {
      const { summary, transactions } = await getShiftTransactions(shift)
      return { ...shift, summary, transactions }
    }),
  )
}

/** Nama status untuk badge UI. */
export function shiftStatusLabel(status: ShiftStatus): string {
  return status === 'open' ? 'Berjalan' : 'Ditutup'
}
