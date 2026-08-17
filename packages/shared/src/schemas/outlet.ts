import { z } from 'zod'

export const createOutletSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(3).max(300),
  phone: z.string().max(20).optional(),
  taxPercent: z.number().min(0).max(11).default(0),
  servicePercent: z.number().min(0).max(11).default(0),
  receiptHeader: z.string().max(200).optional(),
  receiptFooter: z.string().max(300).optional(),
})

export const updateOutletSchema = createOutletSchema.partial()

export type CreateOutletInput = z.infer<typeof createOutletSchema>
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>
