/**
 * Data demo LarisPOS — SINGLE SOURCE untuk semua platform (Fase 2 mock).
 *
 * Brand demo: KOPI SENJA — kedai kopi modern Indonesia.
 * Dipakai oleh: apps/mobile (kasir), apps/web (dashboard), apps/landing
 * (testimoni/copy), packages/db (seed). Jangan ubah di satu app saja —
 * semua harus sinkron dari file ini. Saat wiring Fase 3, data ini hanya
 * untuk seed dev (backend), bukan hardcode di frontend.
 */

export const DEMO_BRAND = {
  productName: 'LarisPOS',
  businessName: 'Kopi Senja',
  tagline: 'Kedai kopi — jualan laris, laporan jelas',
} as const

export type DemoOutlet = {
  id: string
  name: string
  address: string
}

/** Outlet demo — 3 cabang kedai kopi (laporan gabungan & per outlet). */
export const DEMO_OUTLETS: DemoOutlet[] = [
  {
    id: 'b6f5c8a1-2d3e-4f5a-9b8c-7d6e5f4a3b21',
    name: 'Kopi Senja — Tebet',
    address: 'Jl. Tebet Raya No. 27, Jakarta Selatan',
  },
  {
    id: 'c7a6d9b2-3e4f-5a6b-8c9d-0e1f2a3b4c32',
    name: 'Kopi Senja — Blok M',
    address: 'Jl. Melawai Raya No. 5, Jakarta Selatan',
  },
  {
    id: 'd8b7eac3-4f5a-6b7c-9d0e-1f2a3b4c5d43',
    name: 'Kopi Senja — Kemang',
    address: 'Jl. Kemang Raya No. 88, Jakarta Selatan',
  },
]

export const DEMO_OUTLET_ID = DEMO_OUTLETS[0].id

export type DemoCashier = {
  id: string
  name: string
  outletId: string
  pin: string
}

/** Kasir demo — PIN 123456 (mock; Fase 3 pakai bcrypt di backend). */
export const DEMO_CASHIERS: DemoCashier[] = [
  {
    id: 'stf-kopi-senja-tebet',
    name: 'Raka Prasetyo',
    outletId: DEMO_OUTLETS[0].id,
    pin: '123456',
  },
  {
    id: 'stf-kopi-senja-blokm',
    name: 'Sari Wulandari',
    outletId: DEMO_OUTLETS[1].id,
    pin: '123456',
  },
  {
    id: 'stf-kopi-senja-kemang',
    name: 'Dimas Saputra',
    outletId: DEMO_OUTLETS[2].id,
    pin: '123456',
  },
]

export type DemoVariant = {
  id: string
  name: string
  sellPrice: number
  stock: number
  lowStockThreshold: number
}

export type DemoProduct = {
  id: string
  name: string
  category: string
  costPrice: number
  /**
   * URL foto asli (Unsplash CDN, diverifikasi HTTP 200). Kosong → placeholder
   * makanan default (gaya GoFood) di web & mobile.
   */
  imageUrl?: string
  variants: DemoVariant[]
}

function variants(
  productId: string,
  sizes: { name: string; sellPrice: number }[],
  stock: number,
  lowStockThreshold = 5
): DemoVariant[] {
  // Sufiks unik per produk (8 karakter terakhir id tanpa dash) → id varian
  // unik global, stabil, dan sinkron di mobile/web/db.
  const suffix = productId.replace(/-/g, '').slice(-8)
  return sizes.map((s, i) => ({
    id: `00000000-0000-4000-8000-${suffix}${String(i + 1).padStart(4, '0')}`,
    name: s.name,
    sellPrice: s.sellPrice,
    stock,
    lowStockThreshold,
  }))
}

function sml(s: number, m: number, l: number) {
  return [
    { name: 'S', sellPrice: s },
    { name: 'M', sellPrice: m },
    { name: 'L', sellPrice: l },
  ]
}

function single(price: number) {
  return [{ name: 'Reguler', sellPrice: price }]
}

/**
 * Menu demo 13 produk — kedai kopi (Espresso s/d Kentang Goreng).
 * Beberapa sengaja stok menipis/habis untuk demo badge & laporan stok:
 * Kopi Susu Gula Aren (Sisa 4), V60 (Sisa 3), Croissant (Habis).
 */
export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: '9a1f5c2e-0000-4000-8000-000000000001',
    name: 'Espresso',
    category: 'Kopi',
    imageUrl:
      'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 5000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000001', sml(15000, 18000, 22000), 60),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000002',
    name: 'Americano',
    category: 'Kopi',
    imageUrl:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 6000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000002', sml(18000, 22000, 26000), 60),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000003',
    name: 'Cappuccino',
    category: 'Kopi',
    imageUrl:
      'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 8000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000003', sml(25000, 29000, 33000), 50),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000004',
    name: 'Cafe Latte',
    category: 'Kopi',
    imageUrl:
      'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 8500,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000004', sml(25000, 29000, 33000), 50),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000005',
    name: 'Kopi Susu Gula Aren',
    category: 'Kopi',
    imageUrl:
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 7000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000005', sml(22000, 25000, 28000), 4),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000006',
    name: 'V60 Manual Brew',
    category: 'Kopi',
    imageUrl:
      'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 10000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000006', sml(28000, 32000, 36000), 3),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000007',
    name: 'Matcha Latte',
    category: 'Minuman',
    imageUrl:
      'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 9000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000007', sml(26000, 30000, 34000), 45),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000008',
    name: 'Es Teh Manis',
    category: 'Minuman',
    imageUrl:
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 1500,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000008', sml(8000, 10000, 12000), 80, 8),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-00000000000a',
    name: 'Croissant',
    category: 'Makanan',
    imageUrl:
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 8000,
    variants: variants('9a1f5c2e-0000-4000-8000-00000000000a', single(20000), 0),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-00000000000b',
    name: 'Roti Bakar Keju',
    category: 'Makanan',
    imageUrl:
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 5000,
    variants: variants('9a1f5c2e-0000-4000-8000-00000000000b', sml(18000, 22000, 25000), 25),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-00000000000c',
    name: 'Banana Bread',
    category: 'Snack',
    imageUrl:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 9000,
    variants: variants('9a1f5c2e-0000-4000-8000-00000000000c', single(24000), 20),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-00000000000d',
    name: 'Kentang Goreng',
    category: 'Snack',
    imageUrl:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=640&h=480&fit=crop&auto=format&q=60',
    costPrice: 6000,
    variants: variants('9a1f5c2e-0000-4000-8000-00000000000d', sml(15000, 18000, 21000), 40),
  },
]

/** Kategori menu demo (urut untuk filter: Semua, Kopi, Makanan, Minuman, Snack). */
export const DEMO_CATEGORIES = ['Kopi', 'Minuman', 'Makanan', 'Snack']

export type DemoPaymentMethod = {
  id: string
  name: string
  type: 'cash' | 'non_cash'
  instruction: string
  isActive: boolean
}

/** Metode bayar demo — Cash / QRIS Statis / Transfer Bank (PRD §10.4). */
export const DEMO_PAYMENT_METHODS: DemoPaymentMethod[] = [
  {
    id: 'f1b0a2c4-0000-4000-8000-000000000001',
    name: 'Cash',
    type: 'cash',
    instruction: 'Terima uang tunai, hitung kembalian.',
    isActive: true,
  },
  {
    id: 'f1b0a2c4-0000-4000-8000-000000000002',
    name: 'QRIS Statis',
    type: 'non_cash',
    instruction: 'Arahkan kamera pembeli ke kode QR.',
    isActive: true,
  },
  {
    id: 'f1b0a2c4-0000-4000-8000-000000000003',
    name: 'Transfer Bank',
    type: 'non_cash',
    instruction: 'Konfirmasi transfer masuk sebelum struk.',
    isActive: true,
  },
]

/** Konfigurasi pajak/layanan demo outlet utama (Tebet). */
export const DEMO_OUTLET_CONFIG = {
  taxPercent: 11,
  servicePercent: 0,
  receiptHeader: 'LarisPOS - Kopi Senja Tebet',
  receiptFooter: 'Terima kasih, sampai jumpa!',
} as const
