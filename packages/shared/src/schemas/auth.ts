import { z } from 'zod'

export const idPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/

export const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(idPhoneRegex, 'Format WA Indonesia tidak valid'),
  password: z.string().min(8),
  businessName: z.string().min(2).max(100),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const cashierLoginSchema = z.object({
  outletId: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/, 'PIN harus 6 digit'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CashierLoginInput = z.infer<typeof cashierLoginSchema>
