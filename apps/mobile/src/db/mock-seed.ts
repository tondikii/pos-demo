import { sql } from 'drizzle-orm'

import { getDrizzle } from './client'
import { queuedTransactions, shifts } from './schema'
import { MOCK_OUTLET_CONFIG, MOCK_PAYMENT_METHODS, MOCK_PRODUCTS } from '../lib/mock-data'

/**
 * Mock seed — DEV ONLY, untuk REVIEW UI (Round 3).
 * Mengisi state yang biasanya kosong supaya kualitas UI/UX semua state
 * bisa dinilai: riwayat transaksi (dibatalkan + gagal), shift riwayat yang
 * sudah DITUTUP (dengan selisih kas), dan antrean sync berisi.
 *
 * AMAN untuk alur offline-first: hanya menulis baris berstatus `voided` dan
 * `failed` — DUA status yang TIDAK pernah di-drain oleh sync engine
 * (hanya `pending` yang diproses & dihapus). Tidak menyentuh logic sync,
 * shift, atau antrean; idempotent (hanya seed jika tabel masih kosong).
 * Saat wiring Fase 3, hapus pemanggilan seed ini.
 */

const STAFF_ID = 'stf-kopi-senja-tebet'

function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function yesterdayAt(hour: number, minute: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(hour, minute, 0, 0)
  return d
}

export async function seedMockData(): Promise<void> {
  const db = await getDrizzle()
  if (!__DEV__) return
  try {
    const tx = await db
      .select({ c: sql<number>`count(*)` })
      .from(queuedTransactions)
      .all()
    const sh = await db.select({ c: sql<number>`count(*)` }).from(shifts).all()
    if (Number(tx[0]?.c ?? 0) > 0 || Number(sh[0]?.c ?? 0) > 0) return

    const kopi = MOCK_PRODUCTS.find((p) => p.name === 'Kopi Susu Gula Aren')
    const croissant = MOCK_PRODUCTS.find((p) => p.name === 'Croissant')
    const cashId = MOCK_PAYMENT_METHODS.find((m) => m.type === 'cash')?.id ?? MOCK_PAYMENT_METHODS[0].id
    const qrisId =
      MOCK_PAYMENT_METHODS.find((m) => m.name === 'QRIS Statis')?.id ?? MOCK_PAYMENT_METHODS[0].id

    const kopiM = kopi?.variants[1]
    const croissantReg = croissant?.variants[0]

    // 1) Transaksi DIBATALKAN (voided) — kemarin, dalam window shift di bawah.
    const voidedAt = yesterdayAt(10, 24)
    const voidedTx = {
      offlineId: uuid(),
      outletId: MOCK_OUTLET_CONFIG.id,
      staffId: STAFF_ID,
      paymentMethodId: qrisId,
      subtotal: 36000,
      taxAmount: 3960,
      serviceAmount: 0,
      total: 39960,
      items: kopiM
        ? [
            {
              productVariantId: kopiM.id,
              productName: 'Kopi Susu Gula Aren',
              variantName: 'M',
              sellPrice: 18000,
              costPrice: 6000,
              qty: 2,
              lineTotal: 36000,
            },
          ]
        : [],
      createdAt: voidedAt.getTime(),
      status: 'voided',
      voidReason: 'pesanan dibatalkan pelanggan',
      voidedAt: yesterdayAt(10, 35).getTime(),
    }

    // 2) Transaksi GAGAL sync (stok tidak cukup) — kemarin.
    const failedAt = yesterdayAt(11, 5)
    const failedTx = {
      offlineId: uuid(),
      outletId: MOCK_OUTLET_CONFIG.id,
      staffId: STAFF_ID,
      paymentMethodId: cashId,
      subtotal: 25000,
      taxAmount: 2750,
      serviceAmount: 0,
      total: 27750,
      items: croissantReg
        ? [
            {
              productVariantId: croissantReg.id,
              productName: 'Croissant',
              variantName: 'Reguler',
              sellPrice: 20000,
              costPrice: 8000,
              qty: 1,
              lineTotal: 20000,
            },
          ]
        : [],
      createdAt: failedAt.getTime(),
    }

    // 3) Shift riwayat SUDAH DITUTUP — kemarin, dengan selisih kas −Rp2.000.
    const opened = yesterdayAt(6, 0)
    const closed = yesterdayAt(14, 0)
    const shift = {
      id: uuid(),
      outletId: MOCK_OUTLET_CONFIG.id,
      staffId: STAFF_ID,
      openingCash: 100000,
      expectedCash: 545000,
      actualCash: 543000,
      difference: -2000,
      status: 'closed' as const,
      openedAt: opened,
      closedAt: closed,
      createdAt: opened,
      updatedAt: closed,
    }

    await db.transaction(async (txDb) => {
      await txDb.insert(queuedTransactions).values({
        offlineId: voidedTx.offlineId,
        payload: voidedTx,
        status: 'voided',
        retries: 0,
        createdAt: voidedAt,
        updatedAt: voidedAt,
      })
      await txDb.insert(queuedTransactions).values({
        offlineId: failedTx.offlineId,
        payload: failedTx,
        status: 'failed',
        retries: 3,
        error: 'INSUFFICIENT_STOCK',
        createdAt: failedAt,
        updatedAt: failedAt,
      })
      await txDb.insert(shifts).values(shift)
    })
  } catch {
    // DB belum siap / error sesaat — lewati; seed berjalan lagi di start berikutnya.
  }
}