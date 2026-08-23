import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import type { CreateStaffInput } from '@larispos/shared'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Modal } from '../components/ui/modal'
import { Badge } from '../components/ui/badge'
import { ToastProvider } from '../components/ui/toast'
import type { ToastApi } from '../components/ui/toast'
import { EmptyState, ErrorState, CardGridSkeleton } from '../components/ui/state'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { StaffFormModal, ResetStaffPinModal } from './StaffFormModal'
import { useAuth } from '../lib/auth-mock'
import { MOCK_OUTLETS } from '../lib/mocks'
import type {
  MockSessionOutlet,
  MockSettingsOutlet,
  MockStaff,
} from '../lib/settings-mocks'
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useResetStaffPin,
  useOutlets,
} from '../lib/queries'

/** Label outlet dari daftar (fallback id pendek bila belum terdaftar). */
function outletLabel(id: string, outlets: MockSettingsOutlet[]): string {
  return outlets.find((o) => o.id === id)?.name ?? id
}

export default function StaffPage() {
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

  // Outlet options (untuk filter + assign staff): demo + sesi.
  const outletsQuery = useOutlets(sessionOutlet)
  const outletOptions = createMemo<MockSettingsOutlet[]>(() => outletsQuery.data ?? [])

  const [filterOutletId, setFilterOutletId] = createSignal<string>('all')

  const staffQuery = useStaff(() => {
    const v = filterOutletId()
    return v === 'all' ? null : v
  })

  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff()
  const resetPinMutation = useResetStaffPin()

  const staff = createMemo<MockStaff[]>(() => staffQuery.data ?? [])

  const submitting = () => createMutation.isPending

  /** Filter list staff per outlet terpilih. */
  const visibleStaff = createMemo(() => {
    const f = filterOutletId()
    if (f === 'all') return staff()
    return staff().filter((s) => s.outletId === f)
  })

  const activeCount = createMemo(() => visibleStaff().filter((s) => s.isActive).length)

  /* --- Modal state --- */
  const [formOpen, setFormOpen] = createSignal(false)
  const [resetPinTarget, setResetPinTarget] = createSignal<MockStaff | null>(null)
  const [editingName, setEditingName] = createSignal<{ id: string; name: string } | null>(null)

  function openCreate() {
    setEditingName(null)
    setFormOpen(true)
  }

  function handleFormSubmit(input: CreateStaffInput) {
    createMutation.mutate(input, {
      onSuccess: () => {
        setFormOpen(false)
        toast.success(`Staff "${input.name}" ditambahkan.`)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Gagal menambahkan staff.')
      },
    })
  }

  function handleToggleActive(s: MockStaff) {
    updateMutation.mutate(
      { id: s.id, input: { isActive: !s.isActive } },
      {
        onSuccess: (updated) => {
          toast.info(`Staff "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Gagal mengubah status staff.')
        },
      },
    )
  }

  /** Ganti nama inline (blur / Enter) — simpan via PATCH. */
  function commitName(id: string) {
    const current = editingName()
    if (!current) return
    const original = staff().find((s) => s.id === id)
    if (!original) {
      setEditingName(null)
      return
    }
    const name = current.name.trim()
    setEditingName(null)
    if (name === original.name || name === '') return
    updateMutation.mutate(
      { id, input: { name } },
      {
        onSuccess: () => toast.success('Nama staff diperbarui.'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Gagal menyimpan nama.'),
      },
    )
  }

  function handleResetPin(s: MockStaff) {
    setResetPinTarget(s)
  }

  function handleResetPinSubmit(pin: string) {
    const target = resetPinTarget()
    if (!target) return
    resetPinMutation.mutate(
      { id: target.id, input: { pin } },
      {
        onSuccess: () => {
          setResetPinTarget(null)
          toast.success(`PIN "${target.name}" berhasil di-reset.`)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Gagal me-reset PIN.')
        },
      },
    )
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
              <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Staf' }]} />
<h1 class="text-2xl font-extrabold tracking-tight text-foreground">Staff</h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {visibleStaff().length} staff · {activeCount()} aktif
              </p>
            </div>
            <Button onClick={openCreate}>+ Tambah staff</Button>
          </div>

          {/* Filter outlet */}
          <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <label class="sr-only" for="staff-outlet">Filter outlet</label>
              <select
                id="staff-outlet"
                value={filterOutletId()}
                onChange={(e) => setFilterOutletId(e.currentTarget.value)}
                class={[
                  'h-10 cursor-pointer rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground',
                  'transition-colors duration-150 hover:border-primary/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                ].join(' ')}
              >
                <option value="all">Semua outlet</option>
                <For each={outletOptions()}>
                  {(o) => <option value={o.id}>{o.name}</option>}
                </For>
              </select>
            </div>
          </div>

          {/* Grid staff */}
          <Show
            when={!staffQuery.isPending}
            fallback={<div class="mt-6"><CardGridSkeleton count={3} /></div>}
          >
            <Show
              when={!staffQuery.isError}
              fallback={
                <div class="mt-6">
                  <ErrorState
                    title="Gagal memuat staff"
                    message={staffQuery.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                    onRetry={() => staffQuery.refetch()}
                  />
                </div>
              }
            >
              <Show
                when={visibleStaff().length > 0}
                fallback={
                  <div class="mt-6">
                    <EmptyState
                      icon="users"
                      title="Belum ada staff"
                      description="Tambahkan kasir pertama Anda — masing-masing punya PIN 6 digit untuk login di aplikasi kasir."
                      action={
                        <Button size="sm" onClick={openCreate}>
                          + Tambah staff
                        </Button>
                      }
                    />
                  </div>
                }
              >
                <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <For each={visibleStaff()}>
                    {(s, i) => (
                      <Motion tag="li"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: (i() * 40) / 1000, easing: 'ease-out' }}
                      >
                        <Card class="flex h-full flex-col">
                          <div class="flex flex-1 flex-col p-5">
                            <div class="flex items-start justify-between gap-2">
                              <Show
                                when={editingName()?.id === s.id}
                                fallback={
                                  <button
                                    type="button"
                                    class="min-w-0 truncate text-base font-bold text-foreground transition-colors duration-150 hover:text-primary"
                                    title="Klik untuk ganti nama"
                                    onClick={() => setEditingName({ id: s.id, name: s.name })}
                                  >
                                    {s.name}
                                  </button>
                                }
                              >
                                <input
                                  aria-label="Nama staff"
                                  value={editingName()?.name ?? ''}
                                  onInput={(e) =>
                                    setEditingName({ id: s.id, name: e.currentTarget.value })
                                  }
                                  onBlur={() => commitName(s.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitName(s.id)
                                    if (e.key === 'Escape') setEditingName(null)
                                  }}
                                  class={[
                                    'h-8 w-full min-w-0 rounded-lg border border-primary/50 bg-card px-2 text-base font-bold text-foreground',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                                  ].join(' ')}
                                />
                              </Show>
                              <Badge variant={s.isActive ? 'success' : 'muted'}>
                                {s.isActive ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </div>

                            <p class="mt-1.5 text-xs text-muted-foreground">
                              {outletLabel(s.outletId, outletOptions())}
                            </p>

                            <div class="mt-4 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2">
                              <span
                                aria-hidden="true"
                                class="flex size-6 shrink-0 items-center justify-center rounded-md bg-card text-[10px] font-bold text-muted-foreground"
                              >
                                🔒
                              </span>
                              <span class="text-xs text-muted-foreground">
                                PIN tersimpan (hash) —{' '}
                                <span class="font-semibold text-foreground">••••••</span>
                              </span>
                            </div>
                          </div>

                          <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(s)}
                              disabled={updateMutation.isPending}
                            >
                              {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleResetPin(s)}>
                              Reset PIN
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

      {/* Modal create staff */}
      <Modal
        open={formOpen()}
        onClose={() => {
          if (!submitting()) setFormOpen(false)
        }}
        title="Tambah staff"
        description="Staff login di aplikasi kasir memakai PIN 6 digit."
        size="md"
      >
        <StaffFormModal
          open={formOpen()}
          defaultOutletId={outlet()?.id ?? MOCK_OUTLETS[0].id}
          outlets={outletOptions()}
          submitting={submitting()}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      </Modal>

      {/* Modal reset PIN */}
      <Modal
        open={resetPinTarget() !== null}
        onClose={() => setResetPinTarget(null)}
        title="Reset PIN staff"
        description={resetPinTarget() ? `Buat PIN baru untuk ${resetPinTarget()!.name}` : undefined}
        size="sm"
      >
        <ResetStaffPinModal
          open={resetPinTarget() !== null}
          staff={resetPinTarget()}
          submitting={resetPinMutation.isPending}
          onClose={() => setResetPinTarget(null)}
          onSubmit={handleResetPinSubmit}
        />
      </Modal>
    </SidebarLayout>
  )
}
