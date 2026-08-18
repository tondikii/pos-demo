/**
 * Formatter angka & tanggal untuk dashboard (id-ID).
 * Dipakai konsisten di StatCard, OmzetChart, dan tabel rincian harian.
 */

/** Format Rupiah penuh, mis. Rp 1.250.000. */
export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Format Rupiah ringkas: 1,2 jt / 850 rb / 120 rb / 9,5 rb. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const nf = (v: number, digits: number) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(v)

  if (abs >= 1_000_000_000) return `${sign}${nf(abs / 1_000_000_000, 1)} M`
  if (abs >= 1_000_000) return `${sign}${nf(abs / 1_000_000, 1)} jt`
  if (abs >= 1_000) return `${sign}${nf(abs / 1_000, 0)} rb`
  return `${sign}${nf(abs, 0)}`
}

/**
 * Label hari untuk grafik/tabel:
 * - hari ini  → "Hari ini"
 * - kemarin   → "Kemarin"
 * - selain itu → "Sen 12" (hari pendek + tanggal)
 */
export function formatDayLabel(dateKey: string, todayKey: string): string {
  const parse = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(parse.getTime())) return dateKey

  if (dateKey === todayKey) return 'Hari ini'
  if (dateKey === dayShift(todayKey, -1)) return 'Kemarin'

  const day = parse.toLocaleDateString('id-ID', { weekday: 'short' })
  const dayNum = parse.getDate()
  return `${day} ${dayNum}`
}

function dayShift(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + delta)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
