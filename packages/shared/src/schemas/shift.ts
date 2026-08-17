import { z } from 'zod'

export const openShiftSchema = z.object({
  outletId: z.string().uuid(),
  openingCash: z.number().min(0),
})

export const closeShiftSchema = z.object({
  actualCash: z.number().min(0),
})

export type OpenShiftInput = z.infer<typeof openShiftSchema>
export type CloseShiftInput = z.infer<typeof closeShiftSchema>
