import { z } from 'zod'
import { PIN_LENGTH } from '../constants'

export const createStaffSchema = z.object({
  outletId: z.string().uuid(),
  name: z.string().min(1).max(100),
  /** PIN 6 digit — hanya digit, divalidasi di shared agar konsisten lintas app. */
  pin: z
    .string()
    .regex(/^\d{6}$/, `PIN harus ${PIN_LENGTH} digit angka`),
})

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

/** Reset PIN — PIN baru 6 digit, tanpa menyentuh field lain. */
export const resetStaffPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, `PIN harus ${PIN_LENGTH} digit angka`),
})

export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>
export type ResetStaffPinInput = z.infer<typeof resetStaffPinSchema>
