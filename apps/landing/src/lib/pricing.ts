/**
 * Harga paket LarisPOS untuk landing page — SINGLE SOURCE dari
 * `packages/shared` (aturan AGENTS.md: jangan duplikasi konstanta).
 */
import { PLANS } from '@larispos/shared'

export { PLANS }

/** Harga starter per bulan (Rp), sumber badge hero: "Mulai Rp 39rb/bulan". */
export const STARTER_MONTHLY = PLANS.starter.monthly

/** Format angka ke rupiah penuh: 39000 → "Rp 39.000". */
export const formatIDR = (n: number) => 'Rp ' + n.toLocaleString('id-ID')