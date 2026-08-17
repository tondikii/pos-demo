import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/larispos'
const client = postgres(url, { max: 1 })
const db = drizzle(client)

await migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations done')
await client.end()
