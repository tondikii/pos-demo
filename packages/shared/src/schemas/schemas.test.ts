import { describe, expect, it } from 'vitest'
import { cashierLoginSchema, loginSchema, registerSchema } from './auth'
import { createProductSchema, variantSchema } from './product'
import { createTransactionSchema } from './transaction'
import { PLANS, PRODUCT_CATEGORIES } from '../constants'
import { DEMO_OUTLETS, DEMO_PRODUCTS } from '../demo'

describe('auth schemas', () => {
  it('register: menerima form 1 langkah yang valid (WA opsional)', () => {
    const ok = registerSchema.safeParse({
      email: 'owner@kopisenja.test',
      password: 'rahasia123',
      businessName: 'Kopi Senja',
    })
    expect(ok.success).toBe(true)
    const withWa = registerSchema.safeParse({
      email: 'owner@kopisenja.test',
      phone: '081234567890',
      password: 'rahasia123',
      businessName: 'Kopi Senja',
    })
    expect(withWa.success).toBe(true)
  })

  it('register: menolak email/WA/password/bisnis tidak valid', () => {
    const bad = registerSchema.safeParse({
      email: 'bukan-email',
      phone: '12345',
      password: 'pendek',
      businessName: 'X',
    })
    expect(bad.success).toBe(false)
    if (!bad.success) {
      expect(bad.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
      expect(bad.error.issues.some((i) => i.path[0] === 'phone')).toBe(true)
      expect(bad.error.issues.some((i) => i.path[0] === 'password')).toBe(true)
    }
  })

  it('login kasir: PIN wajib 6 digit angka', () => {
    expect(cashierLoginSchema.safeParse({ outletId: DEMO_OUTLETS[0].id, pin: '123456' }).success).toBe(true)
    expect(cashierLoginSchema.safeParse({ outletId: DEMO_OUTLETS[0].id, pin: '12345' }).success).toBe(false)
    expect(cashierLoginSchema.safeParse({ outletId: 'bukan-uuid', pin: '123456' }).success).toBe(false)
  })

  it('login owner: email + password wajib', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'a@b.co' }).success).toBe(false)
  })
})

describe('product schemas', () => {
  it('varian: harga jual > 0, stok tidak negatif', () => {
    expect(variantSchema.safeParse({ name: 'S', sellPrice: 15000, stock: 10 }).success).toBe(true)
    expect(variantSchema.safeParse({ name: 'S', sellPrice: 0, stock: 10 }).success).toBe(false)
    expect(variantSchema.safeParse({ name: 'S', sellPrice: 15000, stock: -1 }).success).toBe(false)
  })

  it('produk: minimal 1 varian, nama wajib', () => {
    const base = { outletId: DEMO_OUTLETS[0].id, name: 'Espresso', category: 'Kopi', costPrice: 5000 }
    expect(
      createProductSchema.safeParse({ ...base, variants: [{ name: 'S', sellPrice: 15000, stock: 5 }] }).success,
    ).toBe(true)
    expect(createProductSchema.safeParse({ ...base, variants: [] }).success).toBe(false)
    expect(createProductSchema.safeParse({ ...base, variants: undefined }).success).toBe(false)
  })
})

describe('transaction schema', () => {
  const vid = '00000000-0000-4000-8000-9a1f5c2e0001'
  const offlineId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  const shiftId = '0e7f4a1c-2d3e-4f5a-9b8c-7d6e5f4a3b21'

  it('menolak transaksi tanpa offlineId / item kosong / id tidak UUID', () => {
    const base = {
      outletId: DEMO_OUTLETS[0].id,
      staffId: 'stf-kopi-senja-tebet',
      paymentMethodId: 'f1b0a2c4-0000-4000-8000-000000000001',
      subtotal: 15000,
      taxAmount: 1650,
      serviceAmount: 0,
      total: 16650,
      createdAt: Date.now(),
    }
    const item = { productVariantId: vid, productName: 'Espresso', variantName: 'S', sellPrice: 15000, costPrice: 5000, qty: 1, lineTotal: 15000 }
    expect(
      createTransactionSchema.safeParse({ ...base, offlineId, shiftId, items: [item] }).success,
    ).toBe(true)
    expect(createTransactionSchema.safeParse({ ...base, shiftId, items: [item] }).success).toBe(false)
    expect(createTransactionSchema.safeParse({ ...base, offlineId, shiftId, items: [] }).success).toBe(false)
    expect(
      createTransactionSchema.safeParse({ ...base, offlineId: 'bukan-uuid', shiftId, items: [item] }).success,
    ).toBe(false)
  })
})

describe('constants & demo data', () => {
  it('paket harga sinkron dengan landing (39rb/89rb/149rb)', () => {
    expect(PLANS.starter.monthly).toBe(39000)
    expect(PLANS.tumbuh.monthly).toBe(89000)
    expect(PLANS.jaringan.monthly).toBe(149000)
    expect(PLANS.tumbuh.maxOutlets).toBe(3)
  })

  it('kategori default mencakup kategori menu demo', () => {
    for (const c of new Set(DEMO_PRODUCTS.map((p) => p.category))) {
      expect(PRODUCT_CATEGORIES).toContain(c)
    }
  })

  it('demo: produk punya varian dengan stok & harga valid', () => {
    for (const p of DEMO_PRODUCTS) {
      expect(p.variants.length).toBeGreaterThan(0)
      for (const v of p.variants) {
        expect(v.sellPrice).toBeGreaterThan(0)
        expect(v.stock).toBeGreaterThanOrEqual(0)
      }
    }
    // varian id unik global
    const allVariantIds = DEMO_PRODUCTS.flatMap((p) => p.variants.map((v) => v.id))
    expect(new Set(allVariantIds).size).toBe(allVariantIds.length)
  })
})