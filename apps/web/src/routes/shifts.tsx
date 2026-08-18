import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { AppHeader } from '../components/app/AppHeader'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Modal } from '../components/ui/modal'
import { ToastProvider } from '../components/ui/toast'
import type { ToastApi } from '../components/ui/toast'
import { EmptyState, ErrorState, StatSkeletonCard, ListRowSkeleton } from '../components/ui/state'
import { useAuth } from '../lib/auth-mock'
import { DEFAULT_OUTLET_ID, MOCK_OUTLETS, toDateKey } from '../lib/mocks'
import type { MockOutlet, MockShift, MockShiftPaymentRow } from '../lib/mocks'
import { useShifts } from '../lib/queries'
import { formatIDR, formatDayLabel } from '../lib/format'

/* ------------------------------------------------------------------ */
/* Skeleton & state helpers                                            */
/* ------------------------------------------------------------------ */

function ShiftsSkeleton() {
  return (
    <div aria-busy="true" class="mt-6 space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <For each={[0, 1, 2]}>
          {() => <StatSkeletonCard />}
        </For>
      </div>
      <div class="animate-pulse rounded-2xl border border-border bg-card p-5">
        <div class="h-4 w-40 rounded bg-muted" />
        <div class="mt-4">
          <ListRowSkeleton rows={6} />
        </div>
      </div>
    </div>
  )
}

function ShiftsErrorState(props: { message: string; onRetry: () => void }) {
  return (
    <ErrorState
      title="Gagal memuat riwayat shift"
      message={props.message}
      onRetry={props.onRetry}
      class="mt-6"
    />
  )
}

function ShiftsEmptyState() {
  return (
    <EmptyState
      icon="🕐"
      title="Belum ada shift pada rentang ini"
      description="Tidak ada shift buka/tutup pada rentang tanggal yang dipilih. Coba rentang lain atau outlet lain."
      class="mt-6"
    />
  )
}

/* ------------------------------------------------------------------ */
/* Selisih badge — muncul dengan animasi FadeIn (pos-motion)           */
/* ------------------------------------------------------------------ */

const METHOD_ICON: Record<string, string> = {
  Cash: '💵',
  QRIS: '📱',
  'Transfer Bank': '🏦',
}

/** Badge selisih: hijau (lebih), merah (kurang), abu (pas). */
function DifferenceBadge(props: { shift: MockShift }) {
  const diff = () => props.shift.difference
  const over = () => (diff() ?? 0) > 0
  const exact = () => (diff() ?? 0) === 0

  return (
    <Motion tag="span"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, easing: 'ease-out' }}
    >
      <Badge
        variant={exact() ? 'muted' : over() ? 'success' : 'danger'}
        class="tabular-nums"
      >
        {exact() ? 'Pas' : `${over() ? '+' : '−'} ${formatIDR(Math.abs(diff() ?? 0))}`}
      </Badge>
    </Motion>
  )
}

/* ------------------------------------------------------------------ */
/* Modal detail shift                                                  */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<MockShift['status'], { label: string; variant: 'success' | 'warning' }> = {
  open: { label: 'Shift berjalan', variant: 'warning' },
  closed: { label: 'Selesai', variant: 'success' },
}

function ShiftDetailModal(props: { shift: MockShift | null; onClose: () => void }) {
  const s = () => props.shift
  const statusBadge = () => (s() ? STATUS_BADGE[s()!.status] : STATUS_BADGE.closed)

  const timeLabel = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  /** Total transaksi non-cash (QRIS + Transfer) pada shift. */
  const nonCashTotal = () =>
    (s()?.paymentBreakdown ?? [])
      .filter((r) => r.type === 'non_cash')
      .reduce((sum, r) => sum + r.total, 0)

  return (
    <Modal
      open={s() !== null}
      onClose={props.onClose}
      title={s() ? `Shift ${formatDayLabel(s()!.date, toDateKey(new Date()))}` : 'Shift'}
      description={s() ? `${s()!.cashierName} · ${s()!.openedAt.slice(0, 16).replace('T', ' ')}` : undefined}
      size="lg"
    >
      <Show when={s()} fallback={null}>
        {(shift) => (
          <div class="space-y-5">
            {/* Header status + kasir + jam */}
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <Badge variant={statusBadge().variant}>{statusBadge().label}</Badge>
                <Badge variant="muted">Kasir {shift().cashierName}</Badge>
              </div>
              <div class="text-xs text-muted-foreground tabular-nums">
                {timeLabel(shift().openedAt)}
                <span aria-hidden="true" class="mx-1.5">→</span>
                {shift().closedAt ? timeLabel(shift().closedAt) : 'berjalan'}
              </div>
            </div>

            {/* Ringkasan kas: awal → masuk → void → expected → actual → selisih */}
            <section aria-label="Ringkasan kas shift">
              <h3 class="text-sm font-bold text-foreground">Ringkasan kas</h3>
              <dl class="mt-3 space-y-2.5 text-sm">
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted-foreground">Kas awal</dt>
                  <dd class="font-semibold text-foreground tabular-nums">
                    {formatIDR(shift().openingCash)}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted-foreground">Cash masuk</dt>
                  <dd class="font-semibold text-emerald-700 tabular-nums">
                    + {formatIDR(shift().cashIn)}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted-foreground">Void</dt>
                  <dd class="font-semibold text-destructive tabular-nums">
                    − {formatIDR(shift().voidAmount)}
                  </dd>
                </div>
                <div class="border-t border-border pt-2.5">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="font-medium text-foreground">Kas expected</dt>
                    <dd class="font-bold text-foreground tabular-nums">
                      {formatIDR(shift().expectedCash)}
                    </dd>
                  </div>
                </div>
                <Show when={shift().actualCash !== null}>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-muted-foreground">Kas aktual</dt>
                    <dd class="font-semibold text-foreground tabular-nums">
                      {formatIDR(shift().actualCash ?? 0)}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="font-medium text-foreground">Selisih</dt>
                    <dd class="font-bold tabular-nums">
                      <DifferenceBadge shift={shift()} />
                    </dd>
                  </div>
                </Show>
              </dl>
            </section>

            {/* Per metode bayar */}
            <section aria-label="Per metode bayar">
              <div class="flex items-baseline justify-between gap-2">
                <h3 class="text-sm font-bold text-foreground">Per metode bayar</h3>
                <span class="text-xs font-medium text-muted-foreground tabular-nums">
                  {shift().txCount} transaksi
                </span>
              </div>
              <ul class="mt-3 space-y-2">
                <For each={shift().paymentBreakdown}>
                  {(row: MockShiftPaymentRow) => (
                    <li class="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
                      <span class="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                        <span aria-hidden="true" class="text-base leading-none">
                          {METHOD_ICON[row.methodName] ?? '💳'}
                        </span>
                        <span class="truncate">{row.methodName}</span>
                        <span class="text-xs text-muted-foreground">{row.count} trx</span>
                      </span>
                      <span class="shrink-0 text-sm font-bold text-foreground tabular-nums">
                        {formatIDR(row.total)}
                      </span>
                    </li>
                  )}
                </For>
                <li class="flex items-center justify-between gap-3 px-3.5 py-1 text-xs text-muted-foreground">
                  <span>Total non-cash (QRIS + Transfer)</span>
                  <span class="font-semibold text-foreground tabular-nums">
                    {formatIDR(nonCashTotal())}
                  </span>
                </li>
              </ul>
            </section>
          </div>
        )}
      </Show>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Halaman Shifts                                                      */
/* ------------------------------------------------------------------ */

export default function ShiftsPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()

  // Auth guard — sama seperti halaman app lain (Fase 2 mock).
  if (!isAuthenticated()) return <Navigate href="/login" />

  const toastProvider = ToastProvider()
  const toast: ToastApi = toastProvider.api

  /** Outlet yang bisa dipilih: outlet milik user (auth mock) + demo. */
  const outlets = createMemo<MockOutlet[]>(() => {
    const list = [...MOCK_OUTLETS]
    const sessionOutlet = outlet()
    if (sessionOutlet && !list.some((o) => o.id === sessionOutlet.id)) {
      list.unshift({
        id: sessionOutlet.id,
        name: sessionOutlet.name,
        address: sessionOutlet.address,
      })
    }
    return list
  })

  const [outletId, setOutletId] = createSignal(outlet()?.id ?? DEFAULT_OUTLET_ID)
  const [dateFrom, setDateFrom] = createSignal(
    toDateKey(new Date(Date.now() - 13 * 86_400_000)),
  )
  const [dateTo, setDateTo] = createSignal(toDateKey(new Date()))
  const [selectedShift, setSelectedShift] = createSignal<MockShift | null>(null)

  const shifts = useShifts(outletId)

  /** Filter rentang dilakukan lokal — mock menghasilkan 14 hari penuh. */
  const visibleShifts = createMemo(() => {
    const from = dateFrom()
    const to = dateTo()
    return (shifts.data ?? [])
      .filter((s) => s.date >= from && s.date <= to)
      .sort((a, b) => (a.date === b.date ? b.openedAt.localeCompare(a.openedAt) : b.date.localeCompare(a.date)))
  })

  const activeOutlet = createMemo(
    () => outlets().find((o) => o.id === outletId()) ?? outlets()[0],
  )

  const rangeLabel = createMemo(() => {
    const from = dateFrom()
    const to = dateTo()
    return from === to ? from : `${from} s/d ${to}`
  })

  const openCount = createMemo(() => visibleShifts().filter((s) => s.status === 'open').length)

  /** Selisih total dari shift tertutup dalam rentang (untuk ringkasan kecil). */
  const totalDifference = createMemo(() =>
    visibleShifts()
      .filter((s) => s.difference !== null)
      .reduce((sum, s) => sum + (s.difference ?? 0), 0),
  )

  /** Ringkasan kas: perbarui lewat aksi kartu (mock demo). */
  const notifyShiftOpen = () => {
    toast.info('Fase 2: buka shift dikelola dari aplikasi kasir (apps/mobile).')
  }

  return (
    <div class="min-h-dvh bg-background">
      {toastProvider.view}

      <AppHeader userLabel={user()?.businessName} onLogout={() => logout()} />

      <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Motion tag="div"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, easing: 'ease-out' }}
        >
          {/* Judul + aksi */}
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="text-2xl font-extrabold tracking-tight text-foreground">Shifts</h1>
              <p class="mt-1 text-sm text-muted-foreground">
                Riwayat buka/tutup shift kasir · {activeOutlet().name} · {rangeLabel()}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => notifyShiftOpen()}>
              Buka shift
            </Button>
          </div>

          {/* Filter outlet + tanggal */}
          <div class="mt-6 flex flex-wrap items-center gap-2">
            <label class="sr-only" for="shift-outlet">
              Pilih outlet
            </label>
            <select
              id="shift-outlet"
              value={outletId()}
              onChange={(e) => setOutletId(e.currentTarget.value)}
              class={[
                'h-10 rounded-xl border bg-card px-3 text-sm font-medium text-foreground',
                'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                'cursor-pointer transition-colors duration-150',
              ].join(' ')}
            >
              <For each={outlets()}>
                {(o) => <option value={o.id}>{o.name}</option>}
              </For>
            </select>

            <label class="sr-only" for="shift-from">
              Dari tanggal
            </label>
            <input
              id="shift-from"
              type="date"
              value={dateFrom()}
              max={dateTo()}
              onInput={(e) => setDateFrom(e.currentTarget.value || toDateKey(new Date()))}
              class={[
                'h-10 rounded-xl border bg-card px-3 text-sm text-foreground',
                'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                'transition-colors duration-150',
              ].join(' ')}
            />
            <span aria-hidden="true" class="text-xs text-muted-foreground">s/d</span>
            <label class="sr-only" for="shift-to">
              Sampai tanggal
            </label>
            <input
              id="shift-to"
              type="date"
              value={dateTo()}
              min={dateFrom()}
              onInput={(e) => setDateTo(e.currentTarget.value || toDateKey(new Date()))}
              class={[
                'h-10 rounded-xl border bg-card px-3 text-sm text-foreground',
                'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                'transition-colors duration-150',
              ].join(' ')}
            />
          </div>

          <Show when={!shifts.isPending} fallback={<ShiftsSkeleton />}>
            <Show
              when={!shifts.isError}
              fallback={
                <ShiftsErrorState
                  message={shifts.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                  onRetry={() => shifts.refetch()}
                />
              }
            >
              <Show when={visibleShifts().length > 0} fallback={<ShiftsEmptyState />}>
                {/* Ringkasan mini */}
                <div class="mt-6 grid gap-4 sm:grid-cols-3">
                  <Motion tag="div"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, easing: 'ease-out' }}
                  >
                    <Card class="h-full">
                      <div class="p-5">
                        <p class="text-xs font-medium text-muted-foreground">Shift tercatat</p>
                        <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                          {visibleShifts().length}
                        </p>
                        <p class="mt-2 text-xs font-semibold text-amber-700">
                          {openCount()} masih berjalan
                        </p>
                      </div>
                    </Card>
                  </Motion>
                  <Motion tag="div"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05, easing: 'ease-out' }}
                  >
                    <Card class="h-full">
                      <div class="p-5">
                        <p class="text-xs font-medium text-muted-foreground">Total transaksi</p>
                        <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                          {visibleShifts().reduce((sum, s) => sum + s.txCount, 0)}
                          <span class="text-base font-bold text-muted-foreground"> trx</span>
                        </p>
                        <p class="mt-2 text-xs text-muted-foreground">Rentang terpilih</p>
                      </div>
                    </Card>
                  </Motion>
                  <Motion tag="div"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1, easing: 'ease-out' }}
                  >
                    <Card class="h-full">
                      <div class="p-5">
                        <p class="text-xs font-medium text-muted-foreground">Selisih total</p>
                        <p
                          class={[
                            'mt-2 text-2xl font-extrabold tracking-tight tabular-nums',
                            totalDifference() > 0
                              ? 'text-emerald-700'
                              : totalDifference() < 0
                                ? 'text-destructive'
                                : 'text-foreground',
                          ].join(' ')}
                        >
                          {totalDifference() > 0 ? '+' : ''}
                          {formatIDR(totalDifference())}
                        </p>
                        <p class="mt-2 text-xs text-muted-foreground">
                          {totalDifference() > 0 ? 'Kas lebih' : totalDifference() < 0 ? 'Kas kurang' : 'Seimbang'}
                        </p>
                      </div>
                    </Card>
                  </Motion>
                </div>

                {/* Tabel riwayat shift — tabel di md+, kartu di mobile */}
                <section
                  aria-label="Riwayat shift"
                  class="mt-6 rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div class="border-b border-border p-5 pb-3">
                    <h2 class="text-base font-bold text-foreground">Riwayat shift</h2>
                    <p class="mt-0.5 text-sm text-muted-foreground">
                      {activeOutlet().name} · klik baris untuk detail kas
                    </p>
                  </div>

                  {/* Tabel — md ke atas */}
                  <div class="hidden overflow-x-auto md:block">
                    <table class="w-full text-left text-sm">
                      <thead>
                        <tr class="border-b border-border text-xs text-muted-foreground">
                          <th scope="col" class="px-5 py-3 font-semibold">Tanggal</th>
                          <th scope="col" class="px-5 py-3 font-semibold">Kasir</th>
                          <th scope="col" class="px-5 py-3 text-right font-semibold">Kas awal</th>
                          <th scope="col" class="px-5 py-3 text-right font-semibold">Expected</th>
                          <th scope="col" class="px-5 py-3 text-right font-semibold">Actual</th>
                          <th scope="col" class="px-5 py-3 text-center font-semibold">Selisih</th>
                          <th scope="col" class="px-5 py-3 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border">
                        <For each={visibleShifts()}>
                          {(shift, i) => (
                            <Motion tag="tr"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: i() * 0.03, easing: 'ease-out' }}
                              tabindex={0}
                              role="button"
                              aria-label={`Lihat detail shift ${formatDayLabel(shift.date, toDateKey(new Date()))} — ${shift.cashierName}, status ${shift.status === 'open' ? 'berjalan' : 'selesai'}`}
                              onClick={() => setSelectedShift(shift)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setSelectedShift(shift)
                                }
                              }}
                              class="cursor-pointer transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50"
                            >
                              <td class="px-5 py-3">
                                <p class="font-semibold text-foreground">
                                  {formatDayLabel(shift.date, toDateKey(new Date()))}
                                </p>
                                <p class="mt-0.5 text-xs text-muted-foreground tabular-nums">
                                  {shift.openedAt.slice(11, 16)}–{shift.closedAt?.slice(11, 16) ?? '…'}
                                </p>
                              </td>
                              <td class="px-5 py-3 text-muted-foreground">{shift.cashierName}</td>
                              <td class="px-5 py-3 text-right text-muted-foreground tabular-nums">
                                {formatIDR(shift.openingCash)}
                              </td>
                              <td class="px-5 py-3 text-right font-semibold text-foreground tabular-nums">
                                {formatIDR(shift.expectedCash)}
                              </td>
                              <td class="px-5 py-3 text-right tabular-nums">
                                {shift.actualCash !== null ? (
                                  <span class="font-semibold text-foreground">
                                    {formatIDR(shift.actualCash)}
                                  </span>
                                ) : (
                                  <span class="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td class="px-5 py-3 text-center">
                                <Show
                                  when={shift.difference !== null}
                                  fallback={<span class="text-xs text-muted-foreground">—</span>}
                                >
                                  <DifferenceBadge shift={shift} />
                                </Show>
                              </td>
                              <td class="px-5 py-3 text-center">
                                <Show
                                  when={shift.status === 'open'}
                                  fallback={<Badge variant="success">Selesai</Badge>}
                                >
                                  <Badge variant="warning">Berjalan</Badge>
                                </Show>
                              </td>
                            </Motion>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>

                  {/* Kartu — mobile (di bawah md) */}
                  <ul class="divide-y divide-border md:hidden">
                    <For each={visibleShifts()}>
                      {(shift) => (
                        <li>
                          <button
                            type="button"
                            onClick={() => setSelectedShift(shift)}
                            class="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50"
                          >
                            <div class="min-w-0">
                              <p class="truncate text-sm font-bold text-foreground">
                                {formatDayLabel(shift.date, toDateKey(new Date()))}
                              </p>
                              <p class="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                                {shift.cashierName} · {shift.openedAt.slice(11, 16)}–
                                {shift.closedAt?.slice(11, 16) ?? '…'}
                              </p>
                            </div>
                            <div class="flex shrink-0 items-center gap-2">
                              <Show
                                when={shift.status === 'open'}
                                fallback={<Badge variant="success">Selesai</Badge>}
                              >
                                <Badge variant="warning">Berjalan</Badge>
                              </Show>
                              <span aria-hidden="true" class="text-muted-foreground">›</span>
                            </div>
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </section>
              </Show>
            </Show>
          </Show>
        </Motion>
      </main>

      {/* Detail shift */}
      <ShiftDetailModal shift={selectedShift()} onClose={() => setSelectedShift(null)} />
    </div>
  )
}
