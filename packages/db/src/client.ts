import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export function createClient(databaseUrl: string) {
  return postgres(databaseUrl, { max: 1 })
}

export function createDb(databaseUrl: string) {
  const client = createClient(databaseUrl)
  return drizzle(client, { schema })
}
