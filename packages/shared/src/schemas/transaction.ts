import { z } from 'zod'

export const transactionItemSchema = z.object({
  productVariantId: z.string().uuid(),
  qty: z.number().int().positive(),
})

export const createTransactionSchema = z.object({
  outletId: z.string().uuid(),
  shiftId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  items: z.array(transactionItemSchema).min(1),
  cashReceived: z.number().min(0).optional(),
  offlineId: z.string().uuid(),
})

export const voidTransactionSchema = z.object({
  reason: z.string().min(3).max(300),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type VoidTransactionInput = z.infer<typeof voidTransactionSchema>
