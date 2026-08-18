import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import * as schema from './schema'
import { LOCAL_DB_DDL } from './init'

/** Satu koneksi SQLite untuk seluruh app (queue + cache produk + shifts). */
const sqlite = openDatabaseSync('larispos.db')

// Bootstrap tabel lokal (idempotent, aman di tiap startup — lihat init.ts).
sqlite.execSync(LOCAL_DB_DDL.join(';\n'))

export const db = drizzle(sqlite, { schema })
