import { createMutation, createQuery, useQueryClient } from '@tanstack/solid-query'
import { maybeThrowMockError, toDateKey } from './mocks'
import {
  mockApi,
  type MockBestSeller,
  type MockBusyHour,
  type MockDashboardData,
  type MockLowStockVariant,
  type MockPaymentBreakdownRow,
  type MockProduct,
  type MockProductFilter,
  type MockShift,
} from './mocks'
import {
  settingsMockApi,
  type MockSessionOutlet,
  type PatchOutletInput,
  type CreateStaffMockInput,
  type UpdateStaffMockInput,
  type ResetStaffPinMockInput,
  type CreatePaymentMethodMockInput,
  type UpdatePaymentMethodMockInput,
} from './settings-mocks'
import { subscriptionMockApi } from './subscription-mocks'
import type {
  MockBillingCycle,
  MockSubscription,
} from './subscription-mocks'
import type {
  CreateOutletInput,
  CreateProductInput,
  UpdateProductInput,
} from '@larispos/shared'
import type { PlanId } from '@larispos/shared'

/**
 * Query key helper — pastikan konsisten antar pemanggil & saat invalidasi.
 */
export const queryKeys = {
  dashboard: {
    summary: (outletId: string) => ['dashboard', 'summary', outletId] as const,
    lowStock: (outletId: string) => ['dashboard', 'low-stock', outletId] as const,
  },
  reports: {
    bestSellers: (outletId: string, from: string, to: string) =>
      ['reports', 'best-sellers', outletId, from, to] as const,
    busyHours: (outletId: string, from: string, to: string) =>
      ['reports', 'busy-hours', outletId, from, to] as const,
    paymentBreakdown: (outletId: string, from: string, to: string) =>
      ['reports', 'payment-methods', outletId, from, to] as const,
  },
  products: {
    /** Key list — semua filter list produk sebuah outlet invalid bersama saat mutasi. */
    list: (outletId: string) => ['products', 'list', outletId] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  outlets: {
    list: () => ['outlets', 'list'] as const,
  },
  staff: {
    list: (outletId: string | null) => ['staff', 'list', outletId ?? 'all'] as const,
  },
  paymentMethods: {
    list: (outletId: string) => ['payment-methods', 'list', outletId] as const,
  },
  shifts: {
    list: (outletId: string) => ['shifts', 'list', outletId] as const,
  },
  subscription: {
    me: () => ['subscription', 'me'] as const,
  },
}

/** Mock latensi — seragam agar skeleton terlihat konsisten di seluruh query. */
export const MOCK_QUERY_DELAY_MS = 300

/** Data dashboard untuk outlet (mock, deterministik — 7 hari penuh). */
export function useDashboardSummary(outletId: () => string) {
  return createQuery(() => ({
    queryKey: queryKeys.dashboard.summary(outletId()),
    queryFn: async () => {
      await mockDelay()
      return mockApi.summary(outletId())
    },
    staleTime: 30_000,
  }))
}

/** Varian stok menipis per outlet (stock <= lowStockThreshold). */
export function useLowStock(outletId: () => string) {
  return createQuery(() => ({
    queryKey: queryKeys.dashboard.lowStock(outletId()),
    queryFn: async () => {
      await mockDelay()
      return mockApi.lowStock(outletId())
    },
    staleTime: 30_000,
  }))
}

/* ------------------------------------------------------------------ */
/* Fase 2A.5 — Laporan (mock)                                         */
/* ------------------------------------------------------------------ */

/** Filter bersama seluruh query laporan — padanan query param Fase 3. */
export interface ReportFilter {
  outletId: string
  /** YYYY-MM-DD (inklusif). */
  from: string
  /** YYYY-MM-DD (inklusif). */
  to: string
}

export interface BestSellersData {
  items: MockBestSeller[]
  bottom: MockBestSeller[]
}

/**
 * Best sellers top 10 + produk sepi untuk sebuah outlet.
 * Rentang tanggal di Fase 2 masih mock (data deterministik per outlet),
 * tetapi `from`/`to` tetap bagian dari key agar refetch saat filter berubah
 * dan siap disambungkan ke `GET /reports/best-sellers` di Fase 3.
 */
export function useBestSellers(filter: () => ReportFilter) {
  return createQuery(() => {
    const f = filter()
    return {
      queryKey: queryKeys.reports.bestSellers(f.outletId, f.from, f.to),
      queryFn: async () => {
        await mockDelay()
        return mockApi.bestSellers(f.outletId)
      },
      staleTime: 30_000,
    }
  })
}

/** Jam ramai (transaksi per jam 06–22) untuk sebuah outlet. */
export function useBusyHours(filter: () => ReportFilter) {
  return createQuery(() => {
    const f = filter()
    return {
      queryKey: queryKeys.reports.busyHours(f.outletId, f.from, f.to),
      queryFn: async () => {
        await mockDelay()
        return mockApi.busyHours(f.outletId)
      },
      staleTime: 30_000,
    }
  })
}

/** Rekap per metode bayar (Cash/QRIS/Transfer) untuk sebuah outlet. */
export function usePaymentBreakdown(filter: () => ReportFilter) {
  return createQuery(() => {
    const f = filter()
    return {
      queryKey: queryKeys.reports.paymentBreakdown(f.outletId, f.from, f.to),
      queryFn: async () => {
        await mockDelay()
        return mockApi.paymentBreakdown(f.outletId)
      },
      staleTime: 30_000,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Fase 2A.3 — Produk & Varian (mock CRUD)                            */
/* ------------------------------------------------------------------ */

/**
 * List produk per outlet dengan filter kategori + search.
 * `filter` accessor agar query ikut refetch saat outlet/filter berubah
 * (key berisi seluruh filter; mutasi meng-invalidate via prefix outlet).
 */
export function useProducts(filter: () => MockProductFilter) {
  return createQuery(() => {
    const f = filter()
    return {
      queryKey: [
        'products',
        'list',
        f.outletId,
        f.category ?? '',
        f.search?.trim().toLowerCase() ?? '',
      ] as const,
      queryFn: async () => {
        await mockDelay()
        return mockApi.listProducts(f)
      },
      staleTime: 30_000,
    }
  })
}

/** Invalidasi semua query list produk milik outlet (dipakai tiap mutasi). */
function invalidateProducts(queryClient: ReturnType<typeof useQueryClient>, outletId: string) {
  return queryClient.invalidateQueries({ queryKey: ['products', 'list', outletId] })
}

/** POST /products — create produk + varian (mock). */
export function useCreateProduct() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async (input: CreateProductInput) => {
      await mockDelay()
      return mockApi.createProduct(input)
    },
    onSuccess: (product) => {
      void invalidateProducts(queryClient, product.outletId)
    },
  }))
}

/** PATCH /products/:id — update produk + varian (mock). */
export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProductInput }) => {
      await mockDelay()
      return mockApi.updateProduct(id, input)
    },
    onSuccess: (product) => {
      void invalidateProducts(queryClient, product.outletId)
    },
  }))
}

/** DELETE /products/:id — hapus produk (mock). */
export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async (id: string) => {
      await mockDelay()
      return mockApi.deleteProduct(id)
    },
    onSuccess: ({ id }) => {
      // Invalidasi semua outlet aman & sederhana; list per outlet tidak cocok
      // tanpa mengetahui outletId produk — pakai invalidasi global key produk.
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(id) })
    },
  }))
}

/** POST /products/reset — kembalikan katalog mock ke seed 12 produk/outlet. */
export function useResetProducts() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async () => {
      await mockDelay()
      return mockApi.resetProducts()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  }))
}

/* ------------------------------------------------------------------ */
/* Fase 2A.4 — Outlet, Staff & Payment Methods (mock CRUD)            */
/* ------------------------------------------------------------------ */

/** List outlet (demo + sesi + buatan user). */
export function useOutlets(session: () => MockSessionOutlet | null) {
  return createQuery(() => ({
    queryKey: queryKeys.outlets.list(),
    queryFn: async () => {
      await mockDelay()
      return settingsMockApi.listOutlets(session())
    },
    staleTime: 30_000,
  }))
}

/** POST /outlets — batas plan dicek di form (tombol disabled + hint). */
export function useCreateOutlet() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async (input: CreateOutletInput) => {
      await mockDelay()
      return settingsMockApi.createOutlet(input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['outlets'] })
    },
  }))
}

/** PATCH /outlets/:id — update pajak/layanan/struk/status. */
export function useUpdateOutlet() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async ({ id, input }: { id: string; input: PatchOutletInput }) => {
      await mockDelay()
      return settingsMockApi.updateOutlet(id, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['outlets'] })
    },
  }))
}

/** PATCH /outlets/:id { isActive } — toggle aktif outlet. */
export function useToggleOutletActive() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async (id: string) => {
      await mockDelay()
      return settingsMockApi.toggleOutletActive(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['outlets'] })
    },
  }))
}

/** List staff — per outlet (atau semua outlet saat `null`). */
export function useStaff(outletId: () => string | null) {
  return createQuery(() => ({
    queryKey: queryKeys.staff.list(outletId()),
    queryFn: async () => {
      await mockDelay()
      return settingsMockApi.listStaff(outletId())
    },
    staleTime: 30_000,
  }))
}

function invalidateStaff(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['staff'] })
}

/** POST /staff — buat staff + PIN 6 digit (mock hash). */
export function useCreateStaff() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async (input: CreateStaffMockInput) => {
      await mockDelay()
      return settingsMockApi.createStaff(input)
    },
    onSuccess: () => {
      void invalidateStaff(queryClient)
    },
  }))
}

/** PATCH /staff/:id — update nama & status aktif. */
export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async ({ id, input }: { id: string; input: UpdateStaffMockInput }) => {
      await mockDelay()
      return settingsMockApi.updateStaff(id, input)
    },
    onSuccess: () => {
      void invalidateStaff(queryClient)
    },
  }))
}

/** PATCH /staff/:id/pin — reset PIN 6 digit (mock hash). */
export function useResetStaffPin() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async ({ id, input }: { id: string; input: ResetStaffPinMockInput }) => {
      await mockDelay()
      return settingsMockApi.resetStaffPin(id, input)
    },
    onSuccess: () => {
      void invalidateStaff(queryClient)
    },
  }))
}

/** List metode bayar sebuah outlet. */
export function usePaymentMethods(outletId: () => string) {
  return createQuery(() => ({
    queryKey: queryKeys.paymentMethods.list(outletId()),
    queryFn: async () => {
      await mockDelay()
      return settingsMockApi.listPaymentMethods(outletId())
    },
    staleTime: 30_000,
  }))
}

function invalidatePaymentMethods(
  queryClient: ReturnType<typeof useQueryClient>,
  outletId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.paymentMethods.list(outletId),
  })
}

/** POST /payment-methods — buat metode bayar baru. */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async (input: CreatePaymentMethodMockInput) => {
      await mockDelay()
      return settingsMockApi.createPaymentMethod(input)
    },
    onSuccess: (method) => {
      void invalidatePaymentMethods(queryClient, method.outletId)
    },
  }))
}

/** PATCH /payment-methods/:id — update nama/tipe/instruksi. */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: UpdatePaymentMethodMockInput
    }) => {
      await mockDelay()
      return settingsMockApi.updatePaymentMethod(id, input)
    },
    onSuccess: (method) => {
      void invalidatePaymentMethods(queryClient, method.outletId)
    },
  }))
}

/** PATCH /payment-methods/:id { isActive } — toggle aktif (guard minimal 1). */
export function useTogglePaymentMethodActive() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async (id: string) => {
      await mockDelay()
      return settingsMockApi.togglePaymentMethodActive(id)
    },
    onSuccess: (method) => {
      void invalidatePaymentMethods(queryClient, method.outletId)
    },
  }))
}

/** POST /settings/reset — kembalikan seluruh settings mock ke seed. */
export function useResetSettings() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async () => {
      await mockDelay()
      return settingsMockApi.resetSettings()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['outlets'] })
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      void queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  }))
}

/* ------------------------------------------------------------------ */
/* Fase 2A.6 — Shifts & Langganan (mock)                              */
/* ------------------------------------------------------------------ */

/** Riwayat shift sebuah outlet — padanan `GET /shifts?outletId=`. */
export function useShifts(outletId: () => string) {
  return createQuery(() => ({
    queryKey: queryKeys.shifts.list(outletId()),
    queryFn: async () => {
      await mockDelay()
      return mockApi.shifts(outletId())
    },
    staleTime: 30_000,
  }))
}

/** Status langganan saat ini — padanan `GET /subscriptions/me`. */
export function useSubscription() {
  return createQuery(() => ({
    queryKey: queryKeys.subscription.me(),
    queryFn: async () => {
      await mockDelay()
      return subscriptionMockApi.me()
    },
    staleTime: 30_000,
  }))
}

/** POST /subscriptions/checkout — upgrade paket (mock, langsung settle). */
export function useUpgradeSubscription() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async ({
      plan,
      billingCycle,
    }: {
      plan: PlanId
      billingCycle: MockBillingCycle
    }) => {
      await mockDelay()
      return subscriptionMockApi.upgrade(plan, billingCycle)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  }))
}

/** Reset langganan ke seed trial — khusus mock (tombol demo di halaman). */
export function useResetSubscription() {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async () => {
      await mockDelay()
      return subscriptionMockApi.reset()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  }))
}

function mockDelay(): Promise<void> {
  // Toggle "Simulasi error" (header) — semua query melempar agar error state
  // tiap halaman bisa diverifikasi (polish 2A.7).
  maybeThrowMockError()
  return new Promise((resolve) => setTimeout(resolve, MOCK_QUERY_DELAY_MS))
}

export type {
  MockBestSeller,
  MockBusyHour,
  MockDashboardData,
  MockLowStockVariant,
  MockPaymentBreakdownRow,
  MockProduct,
  MockProductFilter,
  MockShift,
  MockSubscription,
}

/** Tanggal "hari ini" (lokal) — helper agar konsisten dengan mocks. */
export function todayKey(): string {
  return toDateKey(new Date())
}

/* ------------------------------------------------------------------ */
/* Kategori produk (adjustable)                                        */
/* ------------------------------------------------------------------ */

import { categoriesApi } from './settings-mocks'

export function useCategories(outletId: () => string | null) {
  return createQuery(() => ({
    queryKey: ['categories', outletId() ?? 'all'],
    queryFn: () => categoriesApi.list(outletId()),
  }))
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return createMutation(() => ({
    mutationFn: ({ name, outletId }: { name: string; outletId: string }) =>
      categoriesApi.create(name, outletId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  }))
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return createMutation(() => ({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      categoriesApi.update(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  }))
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return createMutation(() => ({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  }))
}
