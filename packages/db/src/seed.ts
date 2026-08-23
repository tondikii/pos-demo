import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import {
  DEMO_BRAND,
  DEMO_CASHIERS,
  DEMO_OUTLET_CONFIG,
  DEMO_OUTLETS,
  DEMO_PAYMENT_METHODS,
  DEMO_PRODUCTS,
} from '@larispos/shared'

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/larispos'
const client = postgres(url, { max: 1 })
const db = drizzle(client, { schema })

/**
 * Seed dev — brand demo KOPI SENJA (single source: packages/shared/demo.ts),
 * sinkron dengan mock mobile & web. Owner demo + 3 outlet + kasir + metode
 * bayar + menu 13 produk.
 */
async function seed() {
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'owner@kopisenja.test',
      phone: '081234567890',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // placeholder — real hash via backend
      businessName: DEMO_BRAND.businessName,
    })
    .onConflictDoNothing()
    .returning()

  if (!user) {
    console.log('Seed skipped — owner already exists')
    await client.end()
    return
  }

  // 3 outlet Kopi Senja (multi-outlet demo)
  const outlets = await db
    .insert(schema.outlets)
    .values(
      DEMO_OUTLETS.map((o, i) => ({
        ownerId: user.id,
        name: o.name,
        address: o.address,
        taxPercent: i === 0 ? String(DEMO_OUTLET_CONFIG.taxPercent) : '0',
        servicePercent: String(DEMO_OUTLET_CONFIG.servicePercent),
        receiptHeader: i === 0 ? DEMO_OUTLET_CONFIG.receiptHeader : null,
        receiptFooter: DEMO_OUTLET_CONFIG.receiptFooter,
      })),
    )
    .returning()

  await db.insert(schema.subscriptions).values({
    ownerId: user.id,
    plan: 'tumbuh', // 3 outlet demo — sesuai paket Tumbuh
    status: 'trialing',
    maxOutlets: 3,
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  })

  // Kasir demo (PIN akan di-hash bcrypt saat backend Fase 3)
  for (const c of DEMO_CASHIERS) {
    await db.insert(schema.staff).values({
      ownerId: user.id,
      outletId: c.outletId,
      name: c.name,
      pinHash: `mock$${c.pin}`, // placeholder — backend bcrypt di Fase 3
      isActive: true,
    })
  }

  // Metode bayar per outlet (Cash / QRIS Statis / Transfer Bank)
  for (const outlet of outlets) {
    await db.insert(schema.paymentMethods).values(
      DEMO_PAYMENT_METHODS.map((m) => ({
        outletId: outlet.id,
        name: m.name,
        type: m.type,
        instruction: m.instruction,
        isActive: m.isActive,
      })),
    )
  }

  // Menu 13 produk Kopi Senja (varian + stok per varian)
  for (const outlet of outlets) {
    for (const p of DEMO_PRODUCTS) {
      const [prod] = await db
        .insert(schema.products)
        .values({ outletId: outlet.id, name: p.name, category: p.category, costPrice: String(p.costPrice) })
        .returning()
      for (const v of p.variants) {
        await db
          .insert(schema.productVariants)
          .values({
            productId: prod.id,
            name: v.name,
            sellPrice: String(v.sellPrice),
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
          })
      }
    }
  }

  console.log(`Seed done — owner@kopisenja.test / ${DEMO_BRAND.businessName} (${DEMO_OUTLETS.length} outlet, ${DEMO_PRODUCTS.length} produk)`)
  await client.end()
}

seed().catch(async (e) => {
  console.error(e)
  await client.end()
  process.exit(1)
})