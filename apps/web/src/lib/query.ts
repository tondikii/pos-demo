import { QueryClient } from '@tanstack/solid-query'

/**
 * QueryClient singleton untuk apps/web.
 * Fase 2 masih mock — semua fetch lokal, jadi retry nonaktif
 * agar error tampil cepat tanpa hitungan mundur retry.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
})
