import {
  DEMO_OUTLET_CONFIG,
  DEMO_OUTLETS,
  DEMO_PAYMENT_METHODS,
  DEMO_PRODUCTS,
  type DemoPaymentMethod,
} from '@larispos/shared'

/**
 * Mock data Fase 2B.2 — single source dari `packages/shared/demo.ts`
 * (brand demo: Kopi Senja). Tanpa API sampai Fase 3B.3; struktur mengikuti
 * schema lokal (products_cache + variants_cache) yang akan diisi dari
 * `GET /products?outletId=` saat wiring.
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
  /** URL foto produk — belum ada di mock; card pakai placeholder ikon kategori. */
  imageUrl?: string
  variants: MockVariant[]
}

export type MockPaymentMethod = DemoPaymentMethod

const OUTLET_ID = DEMO_OUTLETS[0].id // Kopi Senja — Tebet

/** Menu demo (13 produk, kategori Kopi/Minuman/Makanan/Snack) — sync lintas app. */
export const MOCK_PRODUCTS: MockProduct[] = DEMO_PRODUCTS.map((p) => ({
  id: p.id,
  outletId: OUTLET_ID,
  name: p.name,
  category: p.category,
  costPrice: p.costPrice,
  variants: p.variants.map((v) => ({ ...v, productId: p.id })),
}))

/** Metode bayar mock — Cash/QRIS Statis/Transfer, sesuai payment_methods server. */
export const MOCK_PAYMENT_METHODS: MockPaymentMethod[] = DEMO_PAYMENT_METHODS

/**
 * Konfigurasi pajak & layanan outlet — nanti dari `outlets.taxPercent/servicePercent`
 * (batas 0–11% sesuai schema). Kopi Senja — Tebet: 11% PPN + 0% layanan,
 * biar struk memperlihatkan baris Pajak.
 */
export const MOCK_OUTLET_CONFIG = {
  id: OUTLET_ID,
  name: DEMO_OUTLETS[0].name,
  address: DEMO_OUTLETS[0].address,
  taxPercent: DEMO_OUTLET_CONFIG.taxPercent,
  servicePercent: DEMO_OUTLET_CONFIG.servicePercent,
  receiptHeader: DEMO_OUTLET_CONFIG.receiptHeader,
  receiptFooter: DEMO_OUTLET_CONFIG.receiptFooter,
}

/** Kategori unik untuk filter pills, urut natural: Semua, Kopi, Makanan, Minuman, Snack. */
export const MOCK_CATEGORIES = [
  'Semua',
  ...Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category))).sort(),
]