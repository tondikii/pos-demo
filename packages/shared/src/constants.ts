import { z } from 'zod'

export const PLANS = {
  starter: { label: 'Starter', maxOutlets: 1, monthly: 39000, yearly: 390000 },
  tumbuh: { label: 'Tumbuh', maxOutlets: 3, monthly: 89000, yearly: 890000 },
  jaringan: { label: 'Jaringan', maxOutlets: 99, monthly: 149000, yearly: null as number | null, perOutletExtra: 25000 },
} as const

export type PlanId = keyof typeof PLANS

/**
 * Detail paket — SINGLE SOURCE untuk landing page & dashboard (Task sync).
 * Fitur & tagline IDENTIK di kedua platform; urutan kartu = PLAN_ORDER.
 */
export const PLAN_ORDER: PlanId[] = ['starter', 'tumbuh', 'jaringan']

export const PLAN_DETAILS: Record<
  PlanId,
  { tagline: string; features: readonly string[]; highlighted: boolean }
> = {
  starter: {
    tagline: 'Untuk warung & usaha 1 outlet',
    features: [
      '1 outlet',
      '2 kasir aktif',
      'Kasir cepat <15 detik',
      'Jualan tetap jalan saat offline',
      'Laporan laba otomatis',
      'Stok per varian',
      'Cetak struk Bluetooth',
    ],
    highlighted: false,
  },
  tumbuh: {
    tagline: 'Untuk usaha yang mulai buka cabang',
    features: [
      '3 outlet',
      '5 kasir per outlet',
      'Laporan gabungan semua cabang',
      'Metode bayar fleksibel',
      'Prioritas dukungan',
    ],
    highlighted: true,
  },
  jaringan: {
    tagline: 'Untuk jaringan & franchise',
    features: [
      'Hingga 99 outlet',
      'Outlet tambahan Rp 25rb/outlet',
      'Laporan konsolidasi',
      'Pendampingan dan pelatihan khusus',
      'Penyesuaian harga khusus',
    ],
    highlighted: false,
  },
}

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'dormant',
  'frozen',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const FLOW_STATUSES = {
  transaction: ['completed', 'voided'] as const,
  shift: ['open', 'closed'] as const,
  paymentMethodType: ['cash', 'non_cash'] as const,
}

export const ROLES = ['owner', 'cashier'] as const
export type Role = (typeof ROLES)[number]

export const TRIAL_DAYS = 14
export const GRACE_DAYS = 7
export const DORMANT_DAYS = 7

/** Window default laporan dashboard & filter preset (hari). */
export const DASHBOARD_DAYS = 7

/** Preset filter rentang tanggal pada dashboard/reports. */
export const DATE_RANGE_PRESETS = ['today', '7d', 'custom'] as const
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

export const PIN_LENGTH = 6
export const PIN_MAX_ATTEMPTS = 5
export const PIN_LOCK_MS = 5 * 60 * 1000

/** Kategori produk DEFAULT (seed) — owner bisa tambah/edit/hapus kategori sendiri (adjustable). */
export const PRODUCT_CATEGORIES = [
  'Kopi',
  'Minuman',
  'Makanan',
  'Snack',
] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

/** Schema kategori produk (Zod) — nama kategori 1-30 karakter. */
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(30, 'Maksimal 30 karakter'),
})
export type CategoryInput = z.infer<typeof categorySchema>

/** Threshold stok menipis default per varian (konsisten dgn schema DB). */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5
