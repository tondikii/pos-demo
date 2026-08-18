/**
 * Harga paket LarisPOS untuk landing page.
 *
 * ⚠️ SYNC: Nilai di bawah ini HARUS sama dengan `packages/shared/src/constants.ts`
 * (`PLANS`). Import langsung dari `@larispos/shared` tidak dipakai di sini karena
 * workspace `@larispos/shared` (main → src/index.ts, sumber TS + zod di package.json-nya)
 * belum terpasang sebagai symlink di node_modules apps/landing, sehingga bundling Astro
 * akan gagal. Jika wiring workspace monorepo sudah diperbaiki, ganti file ini dengan:
 *
 *   import { PLANS } from '@larispos/shared'
 *
 * dan hapus konstanta di bawah. Perubahan harga: update di packages/shared dulu,
 * lalu salin ke sini.
 */
export const PLANS = {
  starter: { label: 'Starter', maxOutlets: 1, monthly: 39000, yearly: 390000 },
  tumbuh: { label: 'Tumbuh', maxOutlets: 3, monthly: 89000, yearly: 890000 },
  jaringan: {
    label: 'Jaringan',
    maxOutlets: 99,
    monthly: 149000,
    yearly: null as number | null,
    perOutletExtra: 25000,
  },
} as const

/** Harga starter per bulan (Rp), sumber badge hero: "Mulai Rp 39rb/bulan". */
export const STARTER_MONTHLY = PLANS.starter.monthly

/** Format angka ke rupiah penuh: 39000 → "Rp 39.000". */
export const formatIDR = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
