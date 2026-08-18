import { QueryClientProvider } from '@tanstack/solid-query'
import type { ParentProps } from 'solid-js'
import { AuthMockProvider } from './auth-mock'
import { queryClient } from './query'

/**
 * MockProviders — wrapper provider Fase 2 (mock, tanpa API).
 *
 * Merangkum:
 * - QueryClient singleton (`lib/query.ts`) dengan default options konsisten
 *   (retry false, refetchOnWindowFocus false, staleTime 30s) sehingga seluruh
 *   halaman memakai pola loading/error yang sama.
 * - AuthMockProvider (sesi localStorage).
 *
 * Fase 3: cukup ganti isi wrapper ini dengan provider auth/API asli —
 * halaman tidak perlu diubah.
 */
export function MockProviders(props: ParentProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthMockProvider>{props.children}</AuthMockProvider>
    </QueryClientProvider>
  )
}
