import type { z } from 'zod'

/** Flattened Zod issue map — satu pesan per field (yang pertama muncul). */
export type FieldErrors = Record<string, string>

export type ParseResult<T> =
  | { ok: true; data: T; errors: null }
  | { ok: false; data: null; errors: FieldErrors }

export const DEFAULT_ERROR_MESSAGE = 'Data tidak valid. Periksa kembali isian Anda.'

/** Ambil pesan error pertama dari sebuah ZodIssue. */
function issueMessage(issue: z.ZodIssue): string {
  return issue.message || DEFAULT_ERROR_MESSAGE
}

/** Susun pesan error per field (jalur lengkap, mis. `variants.0.stock`). */
export function flattenZodError(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {}

  for (const issue of error.issues) {
    // Prefer error di node terdalam agar pesan konkret (mis. "Format WA Indonesia tidak valid")
    // menang atas error agregat parent (mis. "Invalid input").
    const path = issue.path.length > 0 ? issue.path.join('.') : '_root'
    if (!fieldErrors[path]) fieldErrors[path] = issueMessage(issue)
  }

  return fieldErrors
}

/**
 * Parse input dengan schema Zod. Kembalikan union bertipe:
 * - sukses → `{ ok: true, data }`
 * - gagal → `{ ok: false, errors }` (errors sudah flatten, siap untuk inline field error)
 *
 * `data` bertipe `z.output<S>` — default dari schema (mis. `category.default('Umum')`)
 * sudah ikut terisi hasil parse.
 */
export function parseWithZod<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): ParseResult<z.output<S>> {
  const result = schema.safeParse(input)
  if (result.success) return { ok: true, data: result.data, errors: null }
  return { ok: false, data: null, errors: flattenZodError(result.error) }
}
