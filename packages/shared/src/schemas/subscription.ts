import { z } from 'zod'
import { PLANS, SUBSCRIPTION_STATUSES } from '../constants'

export const checkoutSchema = z.object({
  plan: z.enum(Object.keys(PLANS) as [keyof typeof PLANS, ...Array<keyof typeof PLANS>]),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
})

export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES as unknown as [string, ...string[]])

export type CheckoutInput = z.infer<typeof checkoutSchema>
