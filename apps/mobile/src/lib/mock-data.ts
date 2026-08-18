import { MOCK_OUTLETS } from '../auth/session'

/**
 * Mock data Fase 2B.2 — belum ada API (tanpa API sampai Fase 3B.3).
 * Struktur mengikuti schema lokal (products_cache + variants_cache) yang
 * akan diisi dari `GET /products?outletId=` saat wiring. Saat itu, ganti
 * MOCK_PRODUCTS dengan hasil query cache — shape sama.
 */

export type MockVariant = {
  id: string
  productId: string
  name: string
  sellPrice: number
  stock: number
  lowStockThreshold: number
}

export type MockProduct = {
  id: string
  outletId: string
  name: string
  category: string
  costPrice: number
  variants: MockVariant[]
}

export type MockPaymentMethod = {
  id: string
  outletId: string
  name: string
  type: 'cash' | 'non_cash'
  instruction: string
  isActive: boolean
}

/** Varian S/M/L standar F&B — harga beda, stok per varian. */
function variants(
  productId: string,
  s: number,
  m: number,
  l: number,
  opts: Partial<Pick<MockVariant, 'stock' | 'lowStockThreshold'>> = {},
): MockVariant[] {
  const stock = opts.stock ?? 50
  const lowStockThreshold = opts.lowStockThreshold ?? 5
  const seed = (n: number) =>
    `00000000-0000-4000-8000-${productId.replaceAll('-', '').slice(0, 8)}${String(n).padStart(4, '0')}`
  return [
    { id: seed(1), productId, name: 'S', sellPrice: s, stock, lowStockThreshold },
    { id: seed(2), productId, name: 'M', sellPrice: m, stock, lowStockThreshold },
    { id: seed(3), productId, name: 'L', sellPrice: l, stock, lowStockThreshold },
  ]
}

const OUTLET_ID = MOCK_OUTLETS[0].id // Warung Demo Pusat

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: '9a1f5c2e-0000-4000-8000-000000000001',
    outletId: OUTLET_ID,
    name: 'Es Teh Manis',
    category: 'Minuman',
    costPrice: 1200,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000001', 4000, 5000, 6000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000002',
    outletId: OUTLET_ID,
    name: 'Es Jeruk Peras',
    category: 'Minuman',
    costPrice: 3500,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000002', 7000, 8000, 10000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000003',
    outletId: OUTLET_ID,
    name: 'Kopi Susu Gula Aren',
    category: 'Kopi',
    costPrice: 6000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000003', 15000, 18000, 20000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000004',
    outletId: OUTLET_ID,
    name: 'Americano',
    category: 'Kopi',
    costPrice: 4500,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000004', 12000, 14000, 16000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000005',
    outletId: OUTLET_ID,
    name: 'Air Mineral',
    category: 'Minuman',
    costPrice: 2500,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000005', 3000, 3000, 4000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000006',
    outletId: OUTLET_ID,
    name: 'Mie Goreng Spesial',
    category: 'Makanan',
    costPrice: 8000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000006', 18000, 20000, 25000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000007',
    outletId: OUTLET_ID,
    name: 'Nasi Goreng Kampung',
    category: 'Makanan',
    costPrice: 9000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000007', 22000, 25000, 28000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000008',
    outletId: OUTLET_ID,
    name: 'Ayam Geprek',
    category: 'Makanan',
    costPrice: 10000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000008', 20000, 22000, 25000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-000000000009',
    outletId: OUTLET_ID,
    name: 'Kentang Goreng',
    category: 'Snack',
    costPrice: 5000,
    variants: variants('9a1f5c2e-0000-4000-8000-000000000009', 12000, 15000, 18000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-00000000000a',
    outletId: OUTLET_ID,
    name: 'Pisang Goreng Keju',
    category: 'Snack',
    costPrice: 4000,
    variants: variants('9a1f5c2e-0000-4000-8000-00000000000a', 10000, 12000, 15000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-00000000000b',
    outletId: OUTLET_ID,
    name: 'Roti Bakar Coklat',
    category: 'Snack',
    costPrice: 4500,
    variants: variants('9a1f5c2e-0000-4000-8000-00000000000b', 12000, 15000, 18000),
  },
  {
    id: '9a1f5c2e-0000-4000-8000-00000000000c',
    outletId: OUTLET_ID,
    name: 'Jus Alpukat',
    category: 'Minuman',
    costPrice: 7000,
    variants: variants('9a1f5c2e-0000-4000-8000-00000000000c', 15000, 18000, 20000),
  },
]

/** Metode bayar mock — Cash/QRIS Statis/Transfer, sesuai payment_methods server. */
export const MOCK_PAYMENT_METHODS: MockPaymentMethod[] = [
  {
    id: 'f1b0a2c4-0000-4000-8000-000000000001',
    outletId: OUTLET_ID,
    name: 'Cash',
    type: 'cash',
    instruction: 'Terima uang tunai, hitung kembalian.',
    isActive: true,
  },
  {
    id: 'f1b0a2c4-0000-4000-8000-000000000002',
    outletId: OUTLET_ID,
    name: 'QRIS Statis',
    type: 'non_cash',
    instruction: 'Arahkan kamera pembeli ke kode QR.',
    isActive: true,
  },
  {
    id: 'f1b0a2c4-0000-4000-8000-000000000003',
    outletId: OUTLET_ID,
    name: 'Transfer Bank',
    type: 'non_cash',
    instruction: 'Konfirmasi transfer masuk sebelum struk.',
    isActive: true,
  },
]

/**
 * Konfigurasi pajak & layanan outlet — nanti dari `outlets.taxPercent/servicePercent`
 * (batas 0–11% sesuai schema). Warung Demo Pusat: 11% PPN + 0% layanan,
 * biar struk memperlihatkan baris Pajak.
 */
export const MOCK_OUTLET_CONFIG = {
  id: OUTLET_ID,
  name: MOCK_OUTLETS[0].name,
  address: MOCK_OUTLETS[0].address,
  taxPercent: 11,
  servicePercent: 0,
  receiptHeader: 'LarisPOS - Warung Demo Pusat',
  receiptFooter: 'Terima kasih, sampai jumpa!',
}

/** Kategori unik untuk filter pills, urut alami: Semua, Makanan, Minuman, Kopi, Snack. */
export const MOCK_CATEGORIES = [
  'Semua',
  ...Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category))).sort(),
]
