import { z } from 'zod'

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  sellPrice: z.number().positive(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
})

export const createProductSchema = z.object({
  outletId: z.string().uuid(),
  name: z.string().min(1).max(150),
  category: z.string().max(50).optional().default('Umum'),
  costPrice: z.number().min(0),
  /** URL foto produk (opsional) — kosong → placeholder makanan default. */
  imageUrl: z.string().url().max(500).optional(),
  variants: z.array(variantSchema).min(1),
})

export const updateProductSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  category: z.string().max(50).optional(),
  costPrice: z.number().min(0).optional(),
  imageUrl: z.string().url().max(500).optional(),
  variants: z.array(variantSchema).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type VariantInput = z.infer<typeof variantSchema>
