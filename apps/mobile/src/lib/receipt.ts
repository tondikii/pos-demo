import { MOCK_OUTLET_CONFIG } from './mock-data'
import { formatDateTime, formatIDR, formatTime } from './format'
import { isVoidedPayload, type QueuedTransactionPayload } from '../db/queue'

/**
 * Struk 58mm — lebar 32 kolom font default (ARCHITECTURE.md §10).
 * Fase 2B.2: preview struk sederhana (modal) setelah bayar; print ESC/POS
 * real + Share fallback menyusul di Fase 2B.6/3B.5. Text helper `textReceipt`
 * sudah siap jadi fallback `Share.share` — shape sama dengan ESC/POS builder.
 */

const W = 32
export const RECEIPT_WIDTH = W

function center(text: string): string {
  const clean = text.slice(0, W)
  const pad = Math.max(0, Math.floor((W - clean.length) / 2))
  return ' '.repeat(pad) + clean
}

function padRight(text: string, width = W): string {
  const clean = text.slice(0, width)
  return clean + ' '.repeat(Math.max(0, width - clean.length))
}

/** row kiri "nama" + kanan "nilai" — nilai selalu rata kanan. */
function row(label: string, value: string): string {
  const v = value.slice(0, W)
  const l = label.slice(0, W - v.length)
  return padRight(l) + v
}

function line(char = '-'): string {
  return char.repeat(W)
}

/** Cek semua stok varian yang dipesan tersedia (cegah over-qty saat bayar). */
export function hasEnoughStock(
  items: { qty: number; maxStock: number }[],
): { ok: boolean; outOfStockCount: number } {
  const outOfStockCount = items.filter((i) => i.qty > i.maxStock).length
  return { ok: outOfStockCount === 0, outOfStockCount }
}

export function buildReceiptText(tx: QueuedTransactionPayload): string {
  const { name, address, receiptFooter } = MOCK_OUTLET_CONFIG
  const voided = isVoidedPayload(tx)
  const lines: string[] = []

  // Banner VOID — status transaksi harus tampil jelas (task 2B.4).
  if (voided) {
    lines.push(center('*** DIBATALKAN ***'))
    lines.push(center('(VOID)'))
    lines.push(center('='.repeat(W)))
  }

  lines.push(center(name))
  if (address) lines.push(center(address.slice(0, W)))
  lines.push(line('='))
  lines.push(`No    : ${tx.offlineId.slice(0, 13).toUpperCase()}`)
  lines.push(`Kasir : ${tx.staffId.slice(0, 8)}`)
  lines.push(`Waktu : ${formatDateTime(tx.createdAt)}`)
  if (voided) {
    lines.push(`Void  : ${formatDateTime(tx.voidedAt ?? 0)}`)
  }
  lines.push(line('-'))
  for (const item of tx.items) {
    const label = `${item.variantName} ${item.productName}`.slice(0, 22)
    lines.push(padRight(label, 22))
    lines.push(row(`${item.qty} x ${formatIDR(item.sellPrice)}`, formatIDR(item.lineTotal)))
    if (item.note) lines.push(`  > ${item.note.slice(0, W - 4)}`)
  }
  lines.push(line('-'))
  lines.push(row('Subtotal', formatIDR(tx.subtotal)))
  if (tx.taxAmount > 0) lines.push(row(`Pajak ${MOCK_OUTLET_CONFIG.taxPercent}%`, formatIDR(tx.taxAmount)))
  if (tx.serviceAmount > 0) lines.push(row('Layanan', formatIDR(tx.serviceAmount)))
  lines.push(row('TOTAL', formatIDR(tx.total)))
  lines.push(line('-'))
  lines.push(`Bayar     : ${formatIDR(tx.cashReceived ?? 0)}`)
  lines.push(`Kembalian : ${formatIDR(tx.change ?? 0)}`)
  lines.push(line('='))
  if (voided) {
    lines.push(center('TRANSAKSI DIBATALKAN'))
    lines.push(center('Stok telah dikembalikan.'))
    lines.push('')
    lines.push(`Alasan   : ${tx.voidReason ?? '-'}`)
  } else {
    lines.push(center('TERIMA KASIH'))
    lines.push(center(receiptFooter.slice(0, W)))
  }
  lines.push('')
  lines.push(`Status: ${receiptStatusLabel(tx)}`)
  lines.push(`Dicetak ${formatTime(Date.now())}`)
  return lines.join('\n')
}

/** Label status untuk baris Status di struk / badge list riwayat. */
export function receiptStatusLabel(tx: QueuedTransactionPayload): string {
  if (isVoidedPayload(tx)) return 'VOIDED'
  return 'Menunggu sync (offline)'
}

/** Header pendek untuk tampilan dalam list struk di layar. */
export function buildReceiptSummary(tx: QueuedTransactionPayload): string {
  return `${MOCK_OUTLET_CONFIG.name} — ${formatDateTime(tx.createdAt)} — ${formatIDR(tx.total)}`
}
