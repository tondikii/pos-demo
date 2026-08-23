import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite'
import { Platform } from 'react-native'

import * as schema from './schema'
import { LOCAL_DB_DDL } from './init'

const DB_NAME = 'larispos.db'
const isWeb = Platform.OS === 'web'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Buka koneksi SQLite — andal di web.
 *
 * expo-sqlite web memakai wa-sqlite via Worker. Panggilan SYNC pertama
 * (`openDatabaseSync`) men-trigger cold-start worker (fetch wasm + init
 * OPFS) yang bisa melewati batas waktu busy-loop sync-nya (error "Sync
 * operation timeout"). Strategi:
 * 1. Hangatkan worker lewat `openDatabaseAsync` (jalur async, andal) dan
 *    TUNGGU sampai selesai — setelah itu worker dijamin hangat.
 * 2. Baru `openDatabaseSync` (kali ini cepat, tanpa timeout) + retry pendek
 *    sebagai jaring pengaman.
 * Koneksi dibuka LAZY (saat pertama dipakai, bukan di module init) supaya
 * warm-up async punya kesempatan berjalan di event loop. Native tidak
 * terpengaruh (jalur langsung).
 */
let dbPromise: Promise<SQLiteDatabase> | null = null

async function openDb(): Promise<SQLiteDatabase> {
  if (isWeb) {
    // Warm-up worker (fetch wasm + OPFS) via jalur async yang tidak punya
    // batas waktu ketat. Gagal → lanjut (retry sync di bawah tetap dicoba).
    await openDatabaseAsync(DB_NAME).catch(() => {})
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const sqlite = openDatabaseSync(DB_NAME)
      // Bootstrap tabel lokal (idempotent, aman di tiap startup — init.ts).
      sqlite.execSync(LOCAL_DB_DDL.join(';\n'))
      return sqlite
    } catch (err) {
      lastErr = err
      if (attempt < 2) await sleep(250)
    }
  }
  throw lastErr
}

/** Satu koneksi SQLite untuk seluruh app (queue + cache produk + shifts). */
export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDb()
  }
  return dbPromise
}

/** Satu koneksi drizzle di atas SQLite — pakai di semua query data layer. */
export async function getDrizzle(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  const sqlite = await getDb()
  return drizzle(sqlite, { schema })
}

export type { ExpoSQLiteDatabase }