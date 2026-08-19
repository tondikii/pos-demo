import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Button } from '../components/ui/button'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { Card } from '../components/ui/card'
import { Modal } from '../components/ui/modal'
import { Badge } from '../components/ui/badge'
import { ToastProvider } from '../components/ui/toast'
import type { ToastApi } from '../components/ui/toast'
import { EmptyState, ErrorState, CardGridSkeleton } from '../components/ui/state'
import { PaymentMethodFormModal } from './PaymentMethodFormModal'
import { useAuth } from '../lib/auth-mock'
import { DEFAULT_OUTLET_ID } from '../lib/mocks'
import type {
  MockSessionOutlet,
  MockSettingsOutlet,
  MockPaymentMethod,
  PaymentType,
} from '../lib/settings-mocks'
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useTogglePaymentMethodActive,
  useOutlets,
} from '../lib/queries'

const TYPE_BADGE: Record<PaymentType, { label: string; variant: 'success' | 'default' }> = {
  cash: { label: 'Cash', variant: 'success' },
  non_cash: { label: 'Non-cash', variant: 'default' },
}

export default function PaymentMethodsPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()

  // Auth guard — Fase 2 mock, redirect ke login bila belum ada sesi.
  if (!isAuthenticated()) return <Navigate href="/login" />

  const toastProvider = ToastProvider()
  const toast: ToastApi = toastProvider.api

  const sessionOutlet = (): MockSessionOutlet | null => {
    const o = outlet()
    if (!o) return null
    return {
      id: o.id,
      name: o.name,
      address: o.address,
      phone: o.phone,
      taxPercent: o.taxPercent,
      servicePercent: o.servicePercent,
      receiptHeader: o.receiptHeader,
      receiptFooter: o.receiptFooter,
      isActive: true,
      createdAt: o.createdAt,
    }
  }

  // Outlet options untuk filter + assign metode.
  const outletsQuery = useOutlets(sessionOutlet)
  const outletOptions = createMemo<MockSettingsOutlet[]>(() => outletsQuery.data ?? [])

  const [outletId, setOutletId] = createSignal(outlet()?.id ?? DEFAULT_OUTLET_ID)

  const methodsQuery = usePaymentMethods(outletId)
  const createMutation = useCreatePaymentMethod()
  const updateMutation = useUpdatePaymentMethod()
  const toggleMutation = useTogglePaymentMethodActive()

  const methods = createMemo<MockPaymentMethod[]>(() => methodsQuery.data ?? [])

  const activeCount = createMemo(() => methods().filter((m) => m.isActive).length)
  const cashCount = createMemo(() => methods().filter((m) => m.type === 'cash').length)

  const submitting = () => createMutation.isPending || updateMutation.isPending

  /* --- Modal state --- */
  const [formOpen, setFormOpen] = createSignal(false)
  const [editing, setEditing] = createSignal<MockPaymentMethod | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(m: MockPaymentMethod) {
    setEditing(m)
    setFormOpen(true)
  }

  function handleFormSubmit(input: {
    name: string
    type: PaymentType
    instruction?: string
    isActive: boolean
  }) {
    const isEdit = editing() !== null
    if (isEdit) {
      updateMutation.mutate(
        { id: editing()!.id, input },
        {
          onSuccess: () => {
            setFormOpen(false)
            setEditing(null)
            toast.success('Metode bayar diperbarui.')
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Gagal menyimpan metode bayar.')
          },
        },
      )
    } else {
      createMutation.mutate(
        { ...input, outletId: outletId() },
        {
          onSuccess: () => {
            setFormOpen(false)
            setEditing(null)
            toast.success('Metode bayar ditambahkan.')
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Gagal menyimpan metode bayar.')
          },
        },
      )
    }
  }

  function handleToggleActive(m: MockPaymentMethod) {
    toggleMutation.mutate(m.id, {
      onSuccess: (updated) => {
        toast.info(`Metode "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Gagal mengubah status metode.')
      },
    })
  }

  return (
    <SidebarLayout
      userLabel={user()?.businessName}
      outletName={outlet()?.name}
      onLogout={() => logout()}
    >
      {toastProvider.view}

      <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Motion tag="div"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, easing: 'ease-out' }}
        >
          {/* Judul + aksi */}
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Metode Bayar' }]} />
              <h1 class="text-2xl font-extrabold tracking-tight text-foreground">
                Metode bayar
              </h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {activeCount()} aktif dari {methods().length} metode
              </p>
            </div>
            <Button onClick={openCreate}>+ Tambah metode</Button>
          </div>

          {/* Filter outlet */}
          <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <label class="sr-only" for="pm-outlet">Pilih outlet</label>
              <select
                id="pm-outlet"
                value={outletId()}
                onChange={(e) => setOutletId(e.currentTarget.value)}
                class={[
                  'h-10 cursor-pointer rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground',
                  'transition-colors duration-150 hover:border-primary/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                ].join(' ')}
              >
                <For each={outletOptions()}>
                  {(o) => <option value={o.id}>{o.name}</option>}
                </For>
              </select>
            </div>
          </div>

          {/* Grid metode bayar */}
          <Show
            when={!methodsQuery.isPending}
            fallback={<div class="mt-6"><CardGridSkeleton count={3} /></div>}
          >
            <Show
              when={!methodsQuery.isError}
              fallback={
                <div class="mt-6">
                  <ErrorState
                    title="Gagal memuat metode bayar"
                    message={methodsQuery.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                    onRetry={() => methodsQuery.refetch()}
                  />
                </div>
              }
            >
              <Show
                when={methods().length > 0}
                fallback={
                  <div class="mt-6">
                    <EmptyState
                      icon="💳"
                      title="Belum ada metode bayar"
                      description="Tambahkan Cash, QRIS, transfer, atau e-wallet. Minimal 1 metode harus aktif."
                      action={
                        <Button size="sm" onClick={openCreate}>
                          + Tambah metode
                        </Button>
                      }
                    />
                  </div>
                }
              >
                <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <For each={methods()}>
                    {(m, i) => {
                      const meta = TYPE_BADGE[m.type]
                      return (
                        <Motion tag="li"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: (i() * 40) / 1000, easing: 'ease-out' }}
                        >
                          <Card class="flex h-full flex-col">
                            <div class="flex flex-1 flex-col p-5">
                              <div class="flex items-start justify-between gap-2">
                                <h2 class="min-w-0 truncate text-base font-bold text-foreground">
                                  {m.name}
                                </h2>
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                              </div>

                              <Show
                                when={m.instruction}
                                fallback={
                                  <p class="mt-1.5 text-xs italic text-muted-foreground">
                                    Tanpa instruksi tambahan.
                                  </p>
                                }
                              >
                                <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {m.instruction}
                                </p>
                              </Show>

                              <div class="mt-4 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2">
                                <span
                                  aria-hidden="true"
                                  class={[
                                    'size-1.5 shrink-0 rounded-full',
                                    m.isActive ? 'bg-emerald-500' : 'bg-slate-400',
                                  ].join(' ')}
                                />
                                <span class="text-xs font-medium text-muted-foreground">
                                  {m.isActive ? 'Aktif di kasir' : 'Nonaktif'}
                                </span>
                              </div>
                            </div>

                            <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(m)}
                                disabled={toggleMutation.isPending}
                              >
                                {m.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => openEdit(m)}>
                                Edit
                              </Button>
                            </div>
                          </Card>
                        </Motion>
                      )
                    }}
                  </For>
                </ul>
              </Show>
            </Show>
          </Show>

          {/* Guard hint: minimal 1 aktif + Cash default */}
          <Show when={methods().length > 0 && (activeCount() <= 1 || cashCount() === 0)}>
            <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
              <span class="font-semibold text-foreground">Perhatian:</span> minimal 1 metode harus
              aktif; metode Cash direkomendasikan tetap aktif sebagai metode default.
            </p>
          </Show>
        </Motion>
      </main>

      {/* Modal create/edit */}
      <Modal
        open={formOpen()}
        onClose={() => {
          if (!submitting()) {
            setFormOpen(false)
            setEditing(null)
          }
        }}
        title={editing() ? 'Edit metode bayar' : 'Tambah metode bayar'}
        description={
          editing()
            ? `Perbarui detail ${editing()!.name}`
            : 'Cash, QRIS, transfer bank, atau e-wallet — tampil di kasir & struk.'
        }
        size="md"
      >
        <PaymentMethodFormModal
          open={formOpen()}
          method={editing()}
          submitting={submitting()}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      </Modal>
    </SidebarLayout>
  )
}
