export const PLANS = {
  starter: { label: 'Starter', maxOutlets: 1, monthly: 39000, yearly: 390000 },
  tumbuh: { label: 'Tumbuh', maxOutlets: 3, monthly: 89000, yearly: 890000 },
  jaringan: { label: 'Jaringan', maxOutlets: 99, monthly: 149000, yearly: null as number | null, perOutletExtra: 25000 },
} as const

export type PlanId = keyof typeof PLANS

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'dormant',
  'frozen',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const FLOW_STATUSES = {
  transaction: ['completed', 'voided'] as const,
  shift: ['open', 'closed'] as const,
  paymentMethodType: ['cash', 'non_cash'] as const,
}

export const ROLES = ['owner', 'cashier'] as const
export type Role = (typeof ROLES)[number]

export const TRIAL_DAYS = 14
export const GRACE_DAYS = 7
export const DORMANT_DAYS = 7

export const PIN_LENGTH = 6
export const PIN_MAX_ATTEMPTS = 5
export const PIN_LOCK_MS = 5 * 60 * 1000
