/**
 * Tipe & helper shift kas — dipakai bersama oleh `db/queue.ts` (rekap shift
 * dari queued_transactions) dan `db/shift.ts` (open/close). Fase 2B.3 mock,
 * tanpa API; mirror `shifts` server (ARCHITECTURE.md §5).
 */

/** Snapshot metode bayar — diambil dari payload queued_transactions. */
export type PaymentBreakdown = {
  paymentMethodId: string
  paymentMethodName: string
  type: 'cash' | 'non_cash'
  count: number
  total: number
}

/** Ringkasan transaksi dalam satu shift (dari antrean lokal). */
export type ShiftTxSummary = {
  count: number
  total: number
  /** Hanya transaksi cash — dasar perhitungan expectedCash (PRD §10.7). */
  cashTotal: number
  /** Rekap per metode bayar, diurutkan total terbesar. */
  byPaymentMethod: PaymentBreakdown[]
}

const CASH_TYPE = 'cash' as const

/** Rekap transaksi dari payload antrean — murni, tanpa side-effect DB. */
export function summarizeShiftTransactions(
  payloads: {
    paymentMethodId: string
    total: number
  }[],
  paymentMethodNames: Record<string, string>,
  paymentMethodTypes: Record<string, 'cash' | 'non_cash'>,
): ShiftTxSummary {
  const byId = new Map<string, PaymentBreakdown>()
  let total = 0
  let cashTotal = 0

  for (const tx of payloads) {
    const id = tx.paymentMethodId
    let bucket = byId.get(id)
    if (!bucket) {
      const type = paymentMethodTypes[id] ?? 'non_cash'
      bucket = {
        paymentMethodId: id,
        paymentMethodName: paymentMethodNames[id] ?? 'Metode lain',
        type,
        count: 0,
        total: 0,
      }
      byId.set(id, bucket)
    }
    bucket.count += 1
    bucket.total += tx.total
    total += tx.total
    if (bucket.type === CASH_TYPE) cashTotal += tx.total
  }

  const byPaymentMethod = [...byId.values()].sort((a, b) => b.total - a.total)
  return { count: byPaymentMethod.reduce((s, b) => s + b.count, 0), total, cashTotal, byPaymentMethod }
}
