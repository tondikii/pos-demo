import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/larispos'
const client = postgres(url, { max: 1 })
const db = drizzle(client, { schema })

async function seed() {
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'owner@larispos.test',
      phone: '081234567890',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // placeholder — real hash via backend
      businessName: 'Warung Demo',
    })
    .onConflictDoNothing()
    .returning()

  if (!user) {
    console.log('Seed skipped — owner already exists')
    await client.end()
    return
  }

  const [outlet] = await db
    .insert(schema.outlets)
    .values({
      ownerId: user.id,
      name: 'Warung Demo Pusat',
      address: 'Jl. Demo No. 1, Jakarta',
      taxPercent: '0',
      servicePercent: '0',
    })
    .returning()

  await db.insert(schema.subscriptions).values({
    ownerId: user.id,
    plan: 'starter',
    status: 'trialing',
    maxOutlets: 1,
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  })

  await db.insert(schema.paymentMethods).values([
    { outletId: outlet.id, name: 'Cash', type: 'cash', isActive: true },
    { outletId: outlet.id, name: 'QRIS Statis', type: 'non_cash', instruction: 'Scan QR di kasir' },
    { outletId: outlet.id, name: 'Transfer', type: 'non_cash' },
  ])

  const sampleProducts = [
    { name: 'Ayam Geprek', category: 'Makanan', costPrice: '12000', variants: [{ name: 'Reguler', sellPrice: '18000', stock: 50 }] },
    { name: 'Kopi Susu', category: 'Minuman', costPrice: '5000', variants: [{ name: 'S', sellPrice: '15000', stock: 30 }, { name: 'M', sellPrice: '18000', stock: 30 }, { name: 'L', sellPrice: '22000', stock: 20 }] },
    { name: 'Nasi Goreng', category: 'Makanan', costPrice: '10000', variants: [{ name: 'Biasa', sellPrice: '16000', stock: 40 }] },
  ]

  for (const p of sampleProducts) {
    const [prod] = await db.insert(schema.products).values({ outletId: outlet.id, name: p.name, category: p.category, costPrice: p.costPrice }).returning()
    for (const v of p.variants) {
      await db.insert(schema.productVariants).values({ productId: prod.id, name: v.name, sellPrice: v.sellPrice, stock: v.stock })
    }
  }

  console.log('Seed done — owner@larispos.test / Warung Demo')
  await client.end()
}

seed().catch(async (e) => {
  console.error(e)
  await client.end()
  process.exit(1)
})
