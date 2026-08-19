import { A, Navigate, useNavigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { createMemo, For, Show } from 'solid-js'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { EmptyState, ErrorState, ListRowSkeleton } from '../components/ui/state'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { useAuth } from '../lib/auth-mock'
import { DEFAULT_OUTLET_ID, MOCK_OUTLETS, toDateKey } from '../lib/mocks'
import type { MockShift } from '../lib/mocks'
import { useShifts } from '../lib/queries'
import { formatIDR, formatDayLabel } from '../lib/format'

/**
 * /cashier — Kasir (web): status shift hari ini + riwayat singkat.
 *
 * PRD Flow 2 & Flow 3: buka/tutup shift adalah inti alur kasir. Di Fase 2
 * (mock, tanpa API) aksi "Buka Shift" diarahkan ke riwayat shift detail
 * (apps/mobile menangani alur kasir penuh); halaman ini tanpa redundancy —
 * hanya memuat inti + tombol ke detail.
 */
export default function CashierPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  if (!isAuthenticated()) return <Navigate href="/login" />

  const outletId = createMemo(() => outlet()?.id ?? DEFAULT_OUTLET_ID)
  const shifts = useShifts(outletId)

  const today = toDateKey(new Date())

  /** Shift berjalan hari ini (status open) — biasanya 1, mock bisa 0. */
  const openShift = createMemo<MockShift | null>(() => {
    const list = shifts.data ?? []
    return list.find((s) => s.status === 'open' && s.date === today) ??
      list.find((s) => s.status === 'open') ??
      null
  })

  /** 5 shift terakhir (semua status) untuk riwayat singkat. */
  const recentShifts = createMemo<MockShift[]>(() =>
    [...(shifts.data ?? [])]
      .sort((a, b) => (a.date === b.date ? b.openedAt.localeCompare(a.openedAt) : b.date.localeCompare(a.date)))
      .slice(0, 5),
  )

  const openCount = createMemo(() => (shifts.data ?? []).filter((s) => s.status === 'open').length)
  const activeOutletName = createMemo(
    () => MOCK_OUTLETS.find((o) => o.id === outletId())?.name ?? outlet()?.name ?? 'Outlet',
  )

  function notifyOpenShift() {
    // Fase 2 mock — buka/tutup shift dilayani aplikasi kasir (apps/mobile).
    navigate('/shifts')
  }

  return (
    <SidebarLayout
      userLabel={user()?.businessName}
      outletName={outlet()?.name ?? activeOutletName()}
      onLogout={() => logout()}
    >
      <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Motion tag="div"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, easing: 'ease-out' }}
        >
          {/* Judul */}
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Breadcrumb items={[{ label: 'Kasir' }]} />
<h1 class="text-2xl font-extrabold tracking-tight text-foreground">Kasir</h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {activeOutletName()} · shift &amp; riwayat kas
              </p>
            </div>
            <Button onClick={notifyOpenShift}>Buka Shift</Button>
          </div>

          <Show when={!shifts.isPending} fallback={<div class="mt-6"><ListRowSkeleton rows={4} /></div>}>
            <Show
              when={!shifts.isError}
              fallback={
                <div class="mt-6">
                  <ErrorState
                    title="Gagal memuat shift"
                    message={shifts.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                    onRetry={() => shifts.refetch()}
                  />
                </div>
              }
            >
              {/* Kartu status shift */}
              <section aria-label="Status shift" class="mt-6">
                <Show
                  when={openShift()}
                  fallback={
                    <Card class="relative overflow-hidden">
                      <div aria-hidden="true" class="absolute -top-16 -right-16 size-48 rounded-full bg-primary/5" />
                      <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-start gap-4">
                          <span
                            aria-hidden="true"
                            class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-6">
                              <rect x="3" y="4" width="18" height="7" rx="1.5" />
                              <path d="M3 11v7a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M8 8h.01M12 8h.01M16 8h.01" />
                            </svg>
                          </span>
                          <div>
                            <h2 class="text-lg font-extrabold tracking-tight text-foreground">
                              Belum ada shift berjalan
                            </h2>
                            <p class="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                              Buka shift sebelum mulai melayani — kasir butuh shift aktif
                              untuk mencatat transaksi.
                            </p>
                          </div>
                        </div>
                        <Button size="lg" onClick={notifyOpenShift}>
                          Buka Shift Sekarang
                        </Button>
                      </div>
                    </Card>
                  }
                >
                  {(shift) => (
                    <Card class="relative overflow-hidden">
                      <div aria-hidden="true" class="absolute -top-16 -right-16 size-48 rounded-full bg-success/10" />
                      <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-start gap-4">
                          <span
                            aria-hidden="true"
                            class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-6">
                              <rect x="3" y="4" width="18" height="7" rx="1.5" />
                              <path d="M3 11v7a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M8 8h.01M12 8h.01M16 8h.01" />
                            </svg>
                          </span>
                          <div>
                            <div class="flex items-center gap-2">
                              <h2 class="text-lg font-extrabold tracking-tight text-foreground">
                                Shift berjalan
                              </h2>
                              <Badge variant="success">Aktif</Badge>
                            </div>
                            <p class="mt-1 text-sm text-muted-foreground">
                              {shift().cashierName} · buka{' '}
                              {shift().openedAt.slice(11, 16)} · kas awal{' '}
                              <span class="font-semibold text-foreground tabular-nums">
                                {formatIDR(shift().openingCash)}
                              </span>
                            </p>
                            <p class="mt-2 text-sm text-muted-foreground">
                              <span class="font-bold text-foreground tabular-nums">
                                {shift().txCount} transaksi
                              </span>{' '}
                              · cash masuk{' '}
                              <span class="font-semibold text-emerald-700 tabular-nums">
                                {formatIDR(shift().cashIn)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div class="flex flex-col items-stretch gap-2 sm:items-end">
                          <Button variant="secondary" size="sm" onClick={() => navigate('/shifts')}>
                            Lihat detail
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </Show>
              </section>

              {/* Ringkasan mini */}
              <div class="mt-4 grid gap-4 sm:grid-cols-3">
                <Card class="p-5">
                  <p class="text-xs font-medium text-muted-foreground">Shift hari ini</p>
                  <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                    {(shifts.data ?? []).filter((s) => s.date === today).length}
                  </p>
                  <p class="mt-2 text-xs font-semibold text-amber-700">
                    {openCount()} masih berjalan
                  </p>
                </Card>
                <Card class="p-5">
                  <p class="text-xs font-medium text-muted-foreground">Kasir aktif</p>
                  <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                    {openCount() > 0 ? 1 : 0}
                  </p>
                  <p class="mt-2 text-xs text-muted-foreground">
                    {openCount() > 0 ? 'Satu shift sedang berjalan' : 'Belum ada shift buka'}
                  </p>
                </Card>
                <Card class="p-5">
                  <p class="text-xs font-medium text-muted-foreground">Total transaksi hari ini</p>
                  <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                    {(shifts.data ?? [])
                      .filter((s) => s.date === today)
                      .reduce((sum, s) => sum + s.txCount, 0)}{' '}
                    <span class="text-base font-bold text-muted-foreground">transaksi</span>
                  </p>
                  <p class="mt-2 text-xs text-muted-foreground">
                    {formatDayLabel(today, today)} di {activeOutletName()}
                  </p>
                </Card>
              </div>

              {/* Riwayat singkat */}
              <section aria-label="Riwayat shift terakhir" class="mt-6">
                <div class="rounded-2xl border border-border bg-card shadow-sm">
                  <div class="flex items-center justify-between gap-3 border-b border-border p-5 pb-3">
                    <div>
                      <h2 class="text-base font-bold text-foreground">Riwayat shift</h2>
                      <p class="mt-0.5 text-sm text-muted-foreground">
                        5 shift terakhir · {activeOutletName()}
                      </p>
                    </div>
                    <A
                      href="/shifts"
                      class="shrink-0 text-sm font-semibold text-primary transition-colors duration-150 hover:text-blue-700 hover:underline"
                    >
                      Lihat semua
                    </A>
                  </div>

                  <Show
                    when={recentShifts().length > 0}
                    fallback={
                      <EmptyState
                        compact
                        icon="clock"
                        title="Belum ada riwayat shift"
                        description="Shift yang dibuka lewat aplikasi kasir akan muncul di sini."
                        action={
                          <Button size="sm" onClick={() => navigate('/shifts')}>
                            Buka halaman shift
                          </Button>
                        }
                      />
                    }
                  >
                    <ul class="divide-y divide-border">
                      <For each={recentShifts()}>
                        {(s) => (
                          <li class="flex items-center justify-between gap-3 px-5 py-3.5">
                            <div class="min-w-0">
                              <p class="truncate text-sm font-bold text-foreground">
                                {formatDayLabel(s.date, today)}
                              </p>
                              <p class="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                                {s.cashierName} · {s.openedAt.slice(11, 16)}–
                                {s.closedAt?.slice(11, 16) ?? '…'} · {s.txCount} transaksi
                              </p>
                            </div>
                            <div class="flex shrink-0 items-center gap-2">
                              <span class="text-sm font-semibold text-foreground tabular-nums">
                                {formatIDR(s.expectedCash)}
                              </span>
                              <Show
                                when={s.status === 'open'}
                                fallback={<Badge variant="success">Selesai</Badge>}
                              >
                                <Badge variant="warning">Berjalan</Badge>
                              </Show>
                            </div>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>
              </section>
            </Show>
          </Show>
        </Motion>
      </main>
    </SidebarLayout>
  )
}
