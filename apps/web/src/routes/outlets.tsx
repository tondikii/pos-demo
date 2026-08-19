import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { PLANS } from '@larispos/shared'
import type { CreateOutletInput } from '@larispos/shared'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Modal } from '../components/ui/modal'
import { Badge } from '../components/ui/badge'
import { ToastProvider } from '../components/ui/toast'
import type { ToastApi } from '../components/ui/toast'
import { EmptyState, ErrorState, CardGridSkeleton } from '../components/ui/state'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { OutletFormModal } from './OutletFormModal'
import { useAuth } from '../lib/auth-mock'
import {
  outletLimitStatus,
  type MockSettingsOutlet,
  type MockSessionOutlet,
} from '../lib/settings-mocks'
import {
  useOutlets,
  useCreateOutlet,
  useUpdateOutlet,
  useToggleOutletActive,
} from '../lib/queries'

function percentLabel(value: number | undefined): string {
  const v = value ?? 0
  return v > 0 ? `${v}%` : '0%'
}

export default function OutletsPage() {
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

  const outletsQuery = useOutlets(sessionOutlet)
  const createMutation = useCreateOutlet()
  const updateMutation = useUpdateOutlet()
  const toggleMutation = useToggleOutletActive()

  const outlets = createMemo<MockSettingsOutlet[]>(() => outletsQuery.data ?? [])

  /** Status batas outlet sesuai plan (Starter = 1 outlet milik user). */
  const limit = createMemo(() => outletLimitStatus(sessionOutlet()))

  const submitting = () => createMutation.isPending || updateMutation.isPending
  const busyToggle = () => toggleMutation.isPending

  /* --- Modal state --- */
  const [formOpen, setFormOpen] = createSignal(false)
  const [editing, setEditing] = createSignal<MockSettingsOutlet | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(o: MockSettingsOutlet) {
    setEditing(o)
    setFormOpen(true)
  }

  function handleFormSubmit(input: CreateOutletInput) {
    const isEdit = editing() !== null
    if (isEdit) {
      updateMutation.mutate(
        { id: editing()!.id, input },
        {
          onSuccess: () => {
            setFormOpen(false)
            setEditing(null)
            toast.success('Outlet diperbarui.')
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Gagal menyimpan outlet.')
          },
        },
      )
    } else {
      createMutation.mutate(input, {
        onSuccess: () => {
          setFormOpen(false)
          setEditing(null)
          toast.success('Outlet ditambahkan.')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Gagal menyimpan outlet.')
        },
      })
    }
  }

  function handleToggleActive(o: MockSettingsOutlet) {
    toggleMutation.mutate(o.id, {
      onSuccess: (updated) => {
        toast.info(`Outlet "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Gagal mengubah status outlet.')
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
              <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Outlet' }]} />
<h1 class="text-2xl font-extrabold tracking-tight text-foreground">Outlet</h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {outlets().length} outlet · paket {PLANS.starter.label} (maks {limit().max})
              </p>
            </div>
            <div class="flex items-center gap-3">
              <Show when={limit().reached}>
                <Badge variant="warning">
                  Limit {limit().max} outlet tercapai
                </Badge>
              </Show>
              <Button
                onClick={openCreate}
                disabled={limit().reached}
                aria-disabled={limit().reached}
                title={limit().reached ? `Paket ${PLANS.starter.label} maksimal ${limit().max} outlet` : undefined}
              >
                + Tambah outlet
              </Button>
            </div>
          </div>

          {/* Hint batas plan */}
          <Show when={limit().reached}>
            <div class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
              Paket <span class="font-semibold">{PLANS.starter.label}</span> Anda maksimal{' '}
              <span class="font-semibold">{limit().max} outlet</span>. Upgrade paket untuk
              menambah outlet lagi.
            </div>
          </Show>

          {/* Grid outlet */}
          <Show
            when={!outletsQuery.isPending}
            fallback={<div class="mt-6"><CardGridSkeleton count={3} /></div>}
          >
            <Show
              when={!outletsQuery.isError}
              fallback={
                <div class="mt-6">
                  <ErrorState
                    title="Gagal memuat outlet"
                    message={outletsQuery.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                    onRetry={() => outletsQuery.refetch()}
                  />
                </div>
              }
            >
              <Show
                when={outlets().length > 0}
                fallback={
                  <div class="mt-6">
                    <EmptyState
                      icon="store"
                      title="Belum ada outlet"
                      description="Tambahkan outlet pertama Anda — pajak, biaya layanan, dan teks struk diatur per outlet."
                      action={
                        <Button size="sm" onClick={openCreate} disabled={limit().reached}>
                          + Tambah outlet
                        </Button>
                      }
                    />
                  </div>
                }
              >
                <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <For each={outlets()}>
                    {(o, i) => (
                      <Motion tag="li"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: (i() * 40) / 1000, easing: 'ease-out' }}
                      >
                        <Card class="flex h-full flex-col">
                          <div class="flex flex-1 flex-col p-5">
                            <div class="flex items-start justify-between gap-2">
                              <h2 class="min-w-0 truncate text-base font-bold text-foreground">
                                {o.name}
                              </h2>
                              <Badge variant={o.isActive ? 'success' : 'muted'}>
                                {o.isActive ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </div>

                            <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {o.address}
                            </p>

                            <div class="mt-4 grid grid-cols-2 gap-2">
                              <div class="rounded-lg bg-muted/40 px-2.5 py-2">
                                <p class="text-[11px] font-medium text-muted-foreground">Pajak</p>
                                <p class="text-sm font-bold text-foreground tabular-nums">
                                  {percentLabel(o.taxPercent)}
                                </p>
                              </div>
                              <div class="rounded-lg bg-muted/40 px-2.5 py-2">
                                <p class="text-[11px] font-medium text-muted-foreground">Layanan</p>
                                <p class="text-sm font-bold text-foreground tabular-nums">
                                  {percentLabel(o.servicePercent)}
                                </p>
                              </div>
                            </div>

                            <Show
                              when={o.receiptHeader || o.receiptFooter}
                              fallback={
                                <p class="mt-3 text-xs text-muted-foreground">
                                  Teks struk belum diatur.
                                </p>
                              }
                            >
                              <p class="mt-3 line-clamp-1 text-xs italic text-muted-foreground">
                                {o.receiptHeader || o.receiptFooter}
                              </p>
                            </Show>
                          </div>

                          <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(o)}
                              disabled={busyToggle()}
                            >
                              {o.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => openEdit(o)}>
                              Edit
                            </Button>
                          </div>
                        </Card>
                      </Motion>
                    )}
                  </For>
                </ul>
              </Show>
            </Show>
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
        title={editing() ? 'Edit outlet' : 'Tambah outlet'}
        description={
          editing()
            ? `Perbarui detail ${editing()!.name}`
            : 'Pajak & layanan dipakai saat transaksi; teks struk tampil di struk 58mm.'
        }
        size="md"
      >
        <OutletFormModal
          open={formOpen()}
          outlet={editing()}
          submitting={submitting()}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      </Modal>
    </SidebarLayout>
  )
}
