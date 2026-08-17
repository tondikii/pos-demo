import { z } from 'zod'

export const paymentMethodSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['cash', 'non_cash']),
  instruction: z.string().max(300).optional(),
  isActive: z.boolean().default(true),
})

export const createPaymentMethodSchema = paymentMethodSchema.extend({
  outletId: z.string().uuid(),
})

export const updatePaymentMethodSchema = paymentMethodSchema.partial()

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>
