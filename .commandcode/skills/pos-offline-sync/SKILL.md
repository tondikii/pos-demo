---
name: pos-offline-sync
description: Offline-first transaction queue for LarisPOS cashier app (expo-sqlite queued_transactions, offlineId idempotency, FIFO NetInfo sync, 409 handling). Use when adding or editing mobile transaction sync, queue storage, or backend idempotency for POST /transactions.
---

# POS Offline Sync

Reusable pattern for Android cashier offline transactions. Derived from `ARCHITECTURE.md` sections 8/11 and `AGENTS.md` section 8.

## When to use
- Any task in `apps/mobile` that touches transaction creation, `queued_transactions`, SQLite cache, or NetInfo sync.
- Any backend change to `POST /transactions` idempotency (`offlineId`) or stock conflict response (409).

## Workflow

1. **Mobile — queue write (offline or failed POST)**
   ```ts
   // apps/mobile/src/db/schema.ts (expo-sqlite + drizzle-orm/expo-sqlite)
   const queued = { offlineId: uuidv4(), payload: JSON.stringify(tx), status: 'pending', retries: 0, createdAt: Date.now() }
   await db.insert(queuedTransactions).values(queued)
   // show badge "Menunggu sync"
   ```

2. **Mobile — sync trigger**
   - Listen `NetInfo.addEventListener(state => state.isConnected && drainQueue())`
   - Also expose manual "Sync sekarang" button.
   - `drainQueue`: `SELECT * FROM queued_transactions WHERE status='pending' ORDER BY createdAt ASC` → FIFO.

3. **Mobile — drain with retry**
   ```ts
   for (const q of pending) {
     try { await fetch('/api/v1/transactions', { body: { ...q.payload, offlineId: q.offlineId } }); await db.delete(q) }
     catch (e) {
       if (e.status === 409) await db.update(q).set({ status: 'failed', error: 'INSUFFICIENT_STOCK' }) // notify owner
       else if (q.retries < 3) await db.update(q).set({ retries: q.retries + 1, status: 'pending' }) // 2s/4s/8s backoff
       else await db.update(q).set({ status: 'failed' })
     }
   }
   ```

4. **Backend — idempotency (Elysia)**
   ```ts
   // apps/backend/src/modules/transactions/index.ts
   // unique index on transactions.offlineId
   await db.insert(transactions).values({ ...body, offlineId: body.offlineId }).onConflictDoNothing({ target: transactions.offlineId })
   // then stock check in same DB transaction with SELECT ... FOR UPDATE
   ```

5. **Product cache (for offline browsing)**
   - On online: `GET /products?outletId=` → upsert into `products_cache` + `variants_cache` (expo-sqlite). POS grid reads from cache.

## References
- Local tables: `queued_transactions`, `products_cache`, `variants_cache` in `apps/mobile/src/db/`.
- Schemas must round-trip through `packages/shared` Zod (include `offlineId` in `transactionSchema`).
- Token stays in `expo-secure-store`; queue never in MMKV/AsyncStorage.

## Checklist before marking done
- [ ] Queue persists across app restart (kill + reopen → still there).
- [ ] 409 conflict surfaces as user-visible error, not silent drop.
- [ ] `offlineId` is client-generated UUIDv4; server treats duplicate as success (idempotent).
- [ ] Manual sync + NetInfo auto-sync both tested.
