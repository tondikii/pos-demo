/**
 * Bootstrap lokal SQLite — `CREATE TABLE IF NOT EXISTS` untuk SEMUA tabel mirror
 * (ARCHITECTURE.md §8 / skill `pos-offline-sync`), dijalankan sekali saat koneksi
 * dibuka (lihat `client.ts`). Idempotent: aman dipanggil ulang, tidak menghapus data.
 *
 * DDL ini sengaja ditulis tangan untuk Fase 2 (mock, tanpa drizzle-kit di mobile);
 * WAJIB sinkron dengan `schema.ts` — jangan ubah satu tanpa yang lain.
 * Saat wiring Fase 3, ganti dengan migrasi `drizzle-kit` bila infra mobile sudah ada.
 */
export const LOCAL_DB_DDL: string[] = [
  // --- products_cache (mirror produk server, Fase 3B.3) ---
  `CREATE TABLE IF NOT EXISTS products_cache (
    id text PRIMARY KEY NOT NULL,
    outlet_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL DEFAULT 'Umum',
    cost_price real NOT NULL DEFAULT 0,
    created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_cache_outlet ON products_cache (outlet_id)`,

  // --- variants_cache (stok per varian) ---
  `CREATE TABLE IF NOT EXISTS variants_cache (
    id text PRIMARY KEY NOT NULL,
    product_id text NOT NULL REFERENCES products_cache (id) ON DELETE CASCADE,
    name text NOT NULL,
    sell_price real NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    low_stock_threshold integer NOT NULL DEFAULT 5,
    created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_cache_product ON variants_cache (product_id)`,

  // --- queued_transactions (antrean offline-first) ---
  `CREATE TABLE IF NOT EXISTS queued_transactions (
    offline_id text PRIMARY KEY NOT NULL,
    payload text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    retries integer NOT NULL DEFAULT 0,
    error text,
    created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,

  // --- shifts (Fase 2B.3, mirror `shifts` server) ---
  `CREATE TABLE IF NOT EXISTS shifts (
    id text PRIMARY KEY NOT NULL,
    outlet_id text NOT NULL,
    staff_id text NOT NULL,
    opening_cash real NOT NULL DEFAULT 0,
    expected_cash real NOT NULL DEFAULT 0,
    actual_cash real,
    difference real,
    status text NOT NULL DEFAULT 'open',
    opened_at integer NOT NULL DEFAULT (unixepoch() * 1000),
    closed_at integer,
    created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  // 1 open shift per kasir per outlet — PRD §10.7
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_open_one_per_staff
    ON shifts (outlet_id, staff_id) WHERE status = 'open'`,
  `CREATE INDEX IF NOT EXISTS idx_shifts_outlet_created ON shifts (outlet_id, opened_at)`,
]
