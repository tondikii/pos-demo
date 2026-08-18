import { PLANS, TRIAL_DAYS } from '@larispos/shared'
import type { PlanId, SubscriptionStatus } from '@larispos/shared'

/**
 * Mock langganan Fase 2A.6 — status + riwayat (TANPA API).
 *
 * State dipersist di localStorage (`larispos_mock_subscription_v1`) sehingga
 * upgrade paket bertahan antar refresh. Bentuk data meniru kontrak
 * `GET /subscriptions/me` + tabel `subscription_history` di packages/db —
 * Fase 3 tinggal mengganti body query/mutation ke Eden Treaty.
 *
 * Alur mock:
 *  - Seed: `trialing` sejak 3 hari lalu → sisa trial = TRIAL_DAYS − 3 (11 hari).
 *  - "Pilih Paket" → status `active` + history entry `upgrade` (nominal sesuai
 *    billing cycle), plan baru; sisa trial jadi 0.
 *  - "Mulai ulang trial" (halaman kosong) → kembali ke seed awal.
 */

export type MockBillingCycle = 'monthly' | 'yearly'

/** Satu baris riwayat langganan — padanan row `subscription_history`. */
export interface MockSubscriptionHistoryEntry {
  id: string
  /** Waktu kejadian (ISO). */
  date: string
  /** Nama paket pada saat itu (label, mis. "Starter"). */
  planLabel: string
  /** Tipe kejadian: checkout / upgrade / trial / invoice. */
  type: 'checkout' | 'upgrade' | 'trial' | 'invoice'
  /** Status langganan setelah kejadian. */
  status: SubscriptionStatus
  /** Nominal transaksi (0 untuk trial). */
  amount: number
}

/** Status langganan saat ini — padanan `GET /subscriptions/me`. */
export interface MockSubscription {
  plan: PlanId
  planLabel: string
  status: SubscriptionStatus
  /** Tanggal trial berakhir (ISO date YYYY-MM-DD) — null setelah upgrade. */
  trialEndsAt: string | null
  /** Tanggal periode berakhir (ISO date) — untuk status aktif. */
  currentPeriodEnd: string | null
  /** Sisa hari trial (0 setelah upgrade / grace / frozen). */
  trialDaysLeft: number
  maxOutlets: number
  history: MockSubscriptionHistoryEntry[]
}

const SUBSCRIPTION_STORAGE_KEY = 'larispos_mock_subscription_v1'

/** Sisa hari untuk menghitung tanggal akhir — dipakai seed & upgrade. */
function dateKeyAt(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Label billing cycle untuk riwayat & konfirmasi. */
export function billingCycleLabel(cycle: MockBillingCycle): string {
  return cycle === 'yearly' ? 'Tahunan' : 'Bulanan'
}

function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function nowIso(): string {
  return new Date().toISOString()
}

/** Seed awal: trial aktif, dimulai 3 hari lalu → sisa 11 hari. */
function seedSubscription(): MockSubscription {
  const ts = nowIso()
  const entry: MockSubscriptionHistoryEntry = {
    id: newUuid(),
    date: ts,
    planLabel: PLANS.starter.label,
    type: 'trial',
    status: 'trialing',
    amount: 0,
  }
  return {
    plan: 'starter',
    planLabel: PLANS.starter.label,
    status: 'trialing',
    trialEndsAt: dateKeyAt(TRIAL_DAYS - 3),
    currentPeriodEnd: null,
    trialDaysLeft: TRIAL_DAYS - 3,
    maxOutlets: PLANS.starter.maxOutlets,
    history: [entry],
  }
}

function normalizeSubscription(sub: MockSubscription): MockSubscription {
  return {
    ...sub,
    plan: typeof sub.plan === 'string' ? (sub.plan as PlanId) : 'starter',
    planLabel: typeof sub.planLabel === 'string' ? sub.planLabel : PLANS.starter.label,
    status: typeof sub.status === 'string' ? (sub.status as SubscriptionStatus) : 'trialing',
    trialEndsAt: typeof sub.trialEndsAt === 'string' ? sub.trialEndsAt : null,
    currentPeriodEnd: typeof sub.currentPeriodEnd === 'string' ? sub.currentPeriodEnd : null,
    trialDaysLeft: typeof sub.trialDaysLeft === 'number' ? sub.trialDaysLeft : 0,
    maxOutlets: typeof sub.maxOutlets === 'number' ? sub.maxOutlets : PLANS.starter.maxOutlets,
    history: Array.isArray(sub.history) ? sub.history : [],
  }
}

let subscriptionDb: MockSubscription | null = null

function loadSubscription(): MockSubscription | null {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeSubscription(parsed as MockSubscription)
  } catch {
    return null
  }
}

function getSubscriptionDb(): MockSubscription {
  if (subscriptionDb) return subscriptionDb
  const stored = loadSubscription()
  subscriptionDb = stored ?? seedSubscription()
  return subscriptionDb
}

function writeSubscriptionDb(next: MockSubscription): MockSubscription {
  subscriptionDb = next
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Kuota penuh / private mode — abaikan, state in-memory tetap jalan.
  }
  return next
}

/* ------------------------------------------------------------------ */
/* Public mock functions (sync)                                        */
/* ------------------------------------------------------------------ */

/** Status langganan saat ini (deterministik antar refresh via storage). */
export function getMockSubscription(): MockSubscription {
  return getSubscriptionDb()
}

/**
 * Upgrade paket (mock) — padanan `POST /subscriptions/checkout` + webhook
 * settlement. Status → `active`, trial berakhir, currentPeriodEnd = +30/+365
 * hari, history ditambah entry `upgrade`.
 */
export function upgradeMockSubscription(
  plan: PlanId,
  billingCycle: MockBillingCycle,
): MockSubscription {
  const current = getSubscriptionDb()
  const planDef = PLANS[plan]
  const amount = billingCycle === 'yearly' ? planDef.yearly ?? planDef.monthly * 12 : planDef.monthly
  const periodDays = billingCycle === 'yearly' ? 365 : 30

  const entry: MockSubscriptionHistoryEntry = {
    id: newUuid(),
    date: nowIso(),
    planLabel: planDef.label,
    type: 'upgrade',
    status: 'active',
    amount,
  }

  return writeSubscriptionDb({
    ...current,
    plan,
    planLabel: planDef.label,
    status: 'active',
    trialEndsAt: null,
    currentPeriodEnd: dateKeyAt(periodDays),
    trialDaysLeft: 0,
    maxOutlets: planDef.maxOutlets,
    history: [...current.history, entry],
  })
}

/** Kembalikan langganan ke seed trial awal (dipakai tombol reset halaman). */
export function resetMockSubscription(): MockSubscription {
  return writeSubscriptionDb(seedSubscription())
}

/* ------------------------------------------------------------------ */
/* API mock (async) — padanan kontrak Fase 3                          */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const subscriptionMockApi = {
  /** GET /subscriptions/me */
  async me(): Promise<MockSubscription> {
    await sleep(300)
    return getMockSubscription()
  },

  /** POST /subscriptions/checkout (mock — langsung settle, tanpa Midtrans). */
  async upgrade(plan: PlanId, billingCycle: MockBillingCycle): Promise<MockSubscription> {
    await sleep(450)
    return upgradeMockSubscription(plan, billingCycle)
  },

  /** Reset ke seed trial (mock) — bukan kontrak Fase 3, khusus demo. */
  async reset(): Promise<MockSubscription> {
    await sleep(250)
    return resetMockSubscription()
  },
}
