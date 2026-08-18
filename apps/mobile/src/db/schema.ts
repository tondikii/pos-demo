import { sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Local SQLite mirror — ARCHITECTURE.md §8 / skill `pos-offline-sync`.
 * Hanya cache & antrean offline; source of truth tetap server Postgres.
 * Pakai real() untuk uang — cukup presisi untuk mock & struktur transaksi
 * (server tetap numeric(12,2) di Fase 3).
 */

/**
 * Status antrean transaksi lokal (Fase 2B.4 menambah `voided`):
 * - pending  → menunggu sync ke server (FIFO)
 * - syncing  → sedang dikirim (dikunci, cegah drain ganda)
 * - voided   → dibatalkan di kasir (Fase 2B.4, mock tanpa API); payload
 *              membawa `status/voidReason/voidedAt` — mirror `transactions.status`
 *              `completed|voided` + `voidReason` server (ARCHITECTURE.md §4.1)
 * - failed   → 409 INSUFFICIENT_STOCK / retries habis — TIDAK bisa di-void
 */
export const QUEUE_STATUSES = ['pending', 'syncing', 'voided', 'failed'] as const
export type QueueStatus = (typeof QUEUE_STATUSES)[number]

export const productsCache = sqliteTable(
  'products_cache',
  {
    id: text('id').primaryKey(), // UUID produk (server)
    outletId: text('outlet_id').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull().default('Umum'),
    costPrice: real('cost_price').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex('idx_products_cache_outlet').on(t.outletId)],
)

export const variantsCache = sqliteTable(
  'variants_cache',
  {
    id: text('id').primaryKey(), // UUID varian (server)
    productId: text('product_id')
      .notNull()
      .references(() => productsCache.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sellPrice: real('sell_price').notNull(),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex('idx_variants_cache_product').on(t.productId)],
)

/**
 * Antrean transaksi offline — status pending|syncing|failed (skill pos-offline-sync).
 * payload adalah JSON dari payload transaksi lengkap (items + snapshot harga,
 * metode bayar, cashReceived) + offlineId. Drained FIFO saat online (Fase 3B.4).
 */
export const queuedTransactions = sqliteTable('queued_transactions', {
  offlineId: text('offline_id').primaryKey(), // UUID v4 di-generate client — idempotency key
  payload: text('payload', { mode: 'json' }).notNull(),
  status: text('status', { mode: 'text' })
    .notNull()
    .$type<QueueStatus>()
    .default('pending'),
  retries: integer('retries').notNull().default(0),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
})

export const SHIFT_STATUSES = ['open', 'closed'] as const
export type ShiftStatus = (typeof SHIFT_STATUSES)[number]

/**
 * Shift kas (Fase 2B.3, mock) — mirror `shifts` server (ARCHITECTURE.md §5).
 * Satu kasir hanya boleh punya 1 shift open per outlet (PRD §10.7) —
 * enforce lewat partial unique index `idx_shifts_open_one_per_staff`:
 *   UNIQUE INDEX ... WHERE status = 'open'
 * Server Fase 3 punya business-logic yang sama; di sini murni lokal.
 */
export const shifts = sqliteTable(
  'shifts',
  {
    id: text('id').primaryKey(), // UUID v4 client (mirror uuid server)
    outletId: text('outlet_id').notNull(),
    staffId: text('staff_id').notNull(),
    openingCash: real('opening_cash').notNull().default(0),
    expectedCash: real('expected_cash').notNull().default(0), // opening + cash masuk - void
    actualCash: real('actual_cash'), // null sampai shift ditutup
    difference: real('difference'), // actual - expected; null sampai ditutup
    status: text('status', { mode: 'text' })
      .notNull()
      .$type<ShiftStatus>()
      .default('open'),
    openedAt: integer('opened_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex('idx_shifts_open_one_per_staff').on(t.outletId, t.staffId).where(sql`${t.status} = 'open'`),
    index('idx_shifts_outlet_created').on(t.outletId, t.openedAt),
  ],
)
