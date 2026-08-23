const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** 15000 → "Rp15.000" */
export function formatIDR(amount: number): string {
  return IDR.format(Math.round(amount))
}

const NUM = new Intl.NumberFormat('id-ID')

/** 15000 → "15.000" (tanpa Rp — untuk struk 58mm) */
export function formatNumber(amount: number): string {
  return NUM.format(Math.round(amount))
}

/** 15500 → "Rp15.500" (dipakai di tombol bayar) */
export function formatIDRCompact(amount: number): string {
  return `Rp${NUM.format(Math.round(amount))}`
}

/**
 * Format input uang saat mengetik — "15000" → "15.000" (separator ribuan).
 * Dipakai input kas awal/aktual shift & uang diterima (konsisten di semua
 * input uang mobile).
 */
export function formatMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits ? NUM.format(Number(digits)) : ''
}

/** Parse hasil formatMoneyInput → number (0 bila kosong/tidak valid). */
export function parseMoneyInput(formatted: string): number {
  const n = Number(formatted.replace(/\D/g, '') || 0)
  return Number.isFinite(n) ? n : 0
}

/** 1699 → "16:59" (jam lokal) */
export function formatTime(ts: number | Date): string {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** 2025-01-12 → "12 Jan 2025" */
export function formatDate(ts: number | Date): string {
  return new Date(ts).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(ts: number | Date): string {
  return `${formatDate(ts)} ${formatTime(ts)}`
}
