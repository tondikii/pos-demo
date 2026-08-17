---
name: pos-subscription-guard
description: Subscription + Midtrans guard for LarisPOS (plans Starter/Tumbuh/Jaringan, trial 14d, status lifecycle, Midtrans Snap webhook SHA512, grace periods). Use when touching subscriptions, outlet limits, or any transaction/shift guard gated by subscription status.
---

# POS Subscription Guard (Midtrans)

Plans and lifecycle from `PRD.md` section 8 and `ARCHITECTURE.md` section 12/13. Backend `apps/backend` + frontend `apps/web` and `packages/shared`.

## Plans

| Plan | Max outlets | Monthly | Yearly |
|------|-------------|---------|--------|
| starter | 1 | 39.000 | 390.000 |
| tumbuh | 3 | 89.000 | 890.000 |
| jaringan | 4+ (custom, +25k/outlet) | from 149.000 | negotiable |

`subscriptions.status`: `trialing | active | past_due | dormant | frozen`

## Workflow

1. **Shared constants (packages/shared)**
   ```ts
   // packages/shared/src/constants.ts
   export const PLANS = { starter: { maxOutlets: 1 }, tumbuh: { maxOutlets: 3 }, jaringan: { maxOutlets: Infinity } }
   export const SUBSCRIPTION_STATUSES = ['trialing','active','past_due','dormant','frozen'] as const
   ```

2. **DB (`packages/db/src/schema.ts`)**
   - `subscriptions` table per ARCHITECTURE §5. `currentPeriodEnd`, `trialEndsAt`, `midtransSubscriptionId`.

3. **Backend guard (Elysia)**
   ```ts
   // apps/backend/src/plugins/subscriptionGuard.ts
   export const subscriptionGuard = (app: Elysia) => app.derive(async ({ jwt }) => {
     const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.ownerId, jwt.ownerId) })
     const allowed = ['trialing','active'].includes(sub.status)
     if (!allowed) throw new HttpError(402, 'SUBSCRIPTION_REQUIRED')
     return { subscription: sub }
   })
   // mount on POST /transactions, POST /shifts/open
   // read-only routes (GET /reports/*) allow dormant too — gate writes, not reads
   ```

4. **Checkout + webhook**
   - `POST /subscriptions/checkout { plan }` → create Midtrans Snap token (`order_id=sub_<ownerId>_<ts>`), return `{ token, redirect_url }`.
   - `POST /webhooks/midtrans` → verify `SHA512(order_id+status_code+gross_amount+serverKey)` before mutating `subscriptions`. `capture|settlement` → `active`, `expire|cancel` → `past_due`. Midtrans retried + daily cron `currentPeriodEnd < now()` → `past_due` → 7d → `dormant` → 7d → `frozen`.

5. **Outlet limit guard**
   - `POST /outlets` checks `count(outlets where ownerId=...) < PLANS[sub.plan].maxOutlets` else 403 `OUTLET_LIMIT_REACHED`.

6. **Frontend (`apps/web`)**
   - Banner "Sisa trial X hari" + CTA upgrade. Read-only mode (no create) when `dormant|frozen`.

## Checklist before marking done
- [ ] Every write-gated route returns 402 `SUBSCRIPTION_REQUIRED` when not `trialing|active`.
- [ ] Webhook never updates state without valid Midtrans signature.
- [ ] `POST /outlets` enforces plan outlet caps; downgrade leaves data intact (inactive flag, not delete).
- [ ] Shared plan constants are the single source of truth — no duplication in apps.
