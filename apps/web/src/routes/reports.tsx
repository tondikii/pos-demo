import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { DASHBOARD_DAYS } from '@larispos/shared'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { EmptyState, ErrorState, StatSkeletonCard, ListRowSkeleton } from '../components/ui/state'
import { DashboardFilters } from '../components/dashboard/DashboardFilters'
import type { DashboardFiltersValue } from '../components/dashboard/DashboardFilters'
import { LowStockCard } from '../components/dashboard/LowStockCard'
import { ToastProvider } from '../components/ui/toast'
import type { ToastApi } from '../components/ui/toast'
import { useAuth } from '../lib/auth-mock'
import {
  BUSY_HOURS_RANGE,
  DEFAULT_OUTLET_ID,
  MOCK_OUTLETS,
  toDateKey,
} from '../lib/mocks'
import type {
  MockBusyHour,
  MockPaymentBreakdownRow,
} from '../lib/mocks'
import {
  useBestSellers,
  useBusyHours,
  useDashboardSummary,
  useLowStock,
  usePaymentBreakdown,
  todayKey,
} from '../lib/queries'
import type { BestSellersData } from '../lib/queries'
import { formatIDR, formatCompact } from '../lib/format'

/* ------------------------------------------------------------------ */
/* Skeleton & state helpers                                            */
/* ------------------------------------------------------------------ */

function ReportSkeleton() {
  return (
    <div aria-busy="true" class="mt-6 space-y-6">
      {/* summary cards */}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <For each={[0, 1, 2, 3]}>
          {() => <StatSkeletonCard />}
        </For>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="animate-pulse rounded-2xl border border-border bg-card p-5">
          <div class="h-4 w-32 rounded bg-muted" />
          <div class="mt-5">
            <ListRowSkeleton rows={6} />
          </div>
        </div>
        <div class="animate-pulse rounded-2xl border border-border bg-card p-5">
          <div class="h-4 w-32 rounded bg-muted" />
          <div class="mt-6 flex h-40 items-end gap-1.5">
            <For each={Array.from({ length: 17 })}>
              {() => <div class="h-20 flex-1 rounded-t bg-muted" />}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportErrorState(props: { message: string; onRetry: () => void }) {
  return (
    <ErrorState
      title="Gagal memuat data laporan"
      message={props.message}
      onRetry={props.onRetry}
      class="mt-6"
    />
  )
}

function ReportEmptyState() {
  return (
    <EmptyState
      icon="chart"
      title="Belum ada data pada rentang ini"
      description="Tidak ada transaksi pada rentang tanggal yang dipilih. Coba rentang lain atau outlet lain."
      class="mt-6"
    />
  )
}

/* ------------------------------------------------------------------ */
/* Sub-komponen laporan                                                 */
/* ------------------------------------------------------------------ */

/** Bar grafik jam ramai — grow scaleY dari bawah, jam puncak di-highlight. */
function BusyHoursChart(props: { hours: MockBusyHour[] }) {
  const maxCount = createMemo(() =>
    props.hours.reduce((max, h) => Math.max(max, h.count), 0),
  )
  const peakHour = createMemo(() =>
    props.hours.reduce<(typeof props.hours)[number] | null>(
      (peak, h) => (h.count > (peak?.count ?? -1) ? h : peak),
      null,
    ),
  )

  return (
    <div>
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-base font-bold text-foreground">Jam ramai</h2>
        <Show when={peakHour()}>
          {(p) => (
            <span class="text-xs font-semibold text-amber-700">
              Puncak {p().hour}:00 — {p().count} transaksi
            </span>
          )}
        </Show>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">
        Transaksi per jam · {BUSY_HOURS_RANGE.from}.00–{BUSY_HOURS_RANGE.to}.00
      </p>

      <div class="mt-6 flex h-40 items-end gap-1.5 sm:h-48">
        <For each={props.hours}>
          {(h, i) => {
            const pct = maxCount() > 0 ? Math.max((h.count / maxCount()) * 100, 3) : 3
            const isPeak = h.hour === peakHour()?.hour
            return (
              <div class="group relative flex h-full flex-1 flex-col justify-end">
                <div
                  role="tooltip"
                  class="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2 py-1 text-center opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
                >
                  <p class="whitespace-nowrap text-[11px] font-bold text-foreground tabular-nums">
                    {h.count} transaksi
                  </p>
                  <p class="whitespace-nowrap text-[10px] text-muted-foreground">
                    {h.hour}.00–{h.hour}.59
                  </p>
                </div>
                <Motion tag="div"
                  initial={{ opacity: 0, scaleY: 0.15 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ duration: 0.4, delay: i() * 0.03, easing: 'ease-out' }}
                  class={[
                    'origin-bottom rounded-t-[3px] transition-colors duration-150',
                    isPeak
                      ? 'bg-amber-500 group-hover:bg-amber-600'
                      : 'bg-primary/30 group-hover:bg-primary/50',
                  ].join(' ')}
                  style={{ height: `${pct}%` }}
                >
                  <span class="sr-only">
                    {h.hour}.00: {h.count} transaksi{isPeak ? ' (puncak)' : ''}
                  </span>
                </Motion>
              </div>
            )
          }}
        </For>
      </div>

      <div class="mt-2 flex gap-1.5">
        <For each={props.hours}>
          {(h) => (
            <div class="flex-1 text-center">
              <span
                class={[
                  'text-[10px] font-medium tabular-nums',
                  h.hour === peakHour()?.hour ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {h.hour}
              </span>
            </div>
          )}
        </For>
      </div>
      <p class="mt-1.5 text-center text-[10px] text-muted-foreground">jam (06 – 22)</p>
    </div>
  )
}

const RANK_BADGE: Record<number, string> = {
  1: 'bg-amber-500/15 text-amber-700',
  2: 'bg-slate-400/15 text-slate-600',
  3: 'bg-orange-500/15 text-orange-700',
}

/** Tabel top 10 best seller — stagger masuk per baris, baris produk sepi ditandai. */
function BestSellersTable(props: { data: BestSellersData }) {
  const maxQty = createMemo(() => props.data.items[0]?.qty ?? 1)

  return (
    <div>
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-base font-bold text-foreground">Best sellers</h2>
        <Badge variant="muted">Top 10 · urut qty</Badge>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">
        Produk terlaris pada rentang terpilih
      </p>

      <div class="mt-4 overflow-hidden rounded-xl border border-border">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">Top 10 produk terlaris</caption>
          <thead>
            <tr class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th scope="col" class="w-12 px-4 py-2.5 font-semibold">#</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Produk</th>
              <th scope="col" class="w-20 px-4 py-2.5 text-right font-semibold">Qty</th>
              <th scope="col" class="w-32 px-4 py-2.5 text-right font-semibold">Omzet</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <For each={props.data.items}>
              {(row, i) => (
                <Motion tag="tr"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i() * 0.03, easing: 'ease-out' }}
                  class="transition-colors duration-150 hover:bg-muted/50"
                >
                  <td class="px-4 py-2.5">
                    <span
                      class={[
                        'inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                        RANK_BADGE[i() + 1] ?? 'bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      {i() + 1}
                    </span>
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-foreground">{row.variantName}</p>
                      {/* bar mini — proporsi qty vs produk terlaris */}
                      <div class="mt-1 h-1 w-full max-w-44 overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-primary/40"
                          style={{ width: `${Math.max((row.qty / maxQty()) * 100, 4)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-2.5 text-right font-semibold text-foreground tabular-nums">
                    {row.qty}
                  </td>
                  <td class="px-4 py-2.5 text-right font-semibold text-foreground tabular-nums">
                    {formatCompact(row.omzet)}
                  </td>
                </Motion>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={props.data.bottom.length > 0}>
        <div class="mt-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perlu perhatian — produk sepi
          </p>
          <ul class="mt-2 space-y-1.5">
            <For each={props.data.bottom}>
              {(row, i) => (
                <Motion tag="li"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: (i() * 30 + 400) / 1000, easing: 'ease-out' }}
                  class="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2"
                >
                  <span class="min-w-0 truncate text-sm text-muted-foreground">
                    {row.variantName}
                  </span>
                  <span class="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                    {row.qty} terjual · {formatCompact(row.omzet)}
                  </span>
                </Motion>
              )}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  )
}

const METHOD_ICON: Record<string, string> = {
  Cash: '💵',
  QRIS: '📱',
  'Transfer Bank': '🏦',
}

/** Rekap metode bayar — list dengan % bar proporsional terhadap total. */
function PaymentBreakdownList(props: { rows: MockPaymentBreakdownRow[] }) {
  const grandTotal = createMemo(() =>
    props.rows.reduce((s, r) => s + r.total, 0),
  )

  return (
    <div>
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-base font-bold text-foreground">Metode pembayaran</h2>
        <Badge variant="muted">Rentang terpilih</Badge>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">
        Rekap transaksi per metode bayar
      </p>

      <ul class="mt-4 space-y-4">
        <For each={props.rows}>
          {(row, i) => {
            const share = grandTotal() > 0 ? (row.total / grandTotal()) * 100 : 0
            return (
              <Motion tag="li"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i() * 0.05, easing: 'ease-out' }}
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" class="text-base leading-none">
                      {METHOD_ICON[row.methodName] ?? '💳'}
                    </span>
                    <p class="truncate text-sm font-semibold text-foreground">
                      {row.methodName}
                      <span class="ml-2 text-xs font-medium text-muted-foreground">
                        {row.count} trx
                      </span>
                    </p>
                  </div>
                  <p class="shrink-0 text-sm font-bold text-foreground tabular-nums">
                    {formatIDR(row.total)}
                  </p>
                </div>
                <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <Motion tag="div"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.45, delay: i() * 0.05 + 0.15, easing: 'ease-out' }}
                    class={[
                      'h-full origin-left rounded-full',
                      row.type === 'cash' ? 'bg-emerald-500' : 'bg-primary',
                    ].join(' ')}
                    style={{ width: `${share}%` }}
                  >
                    <span class="sr-only">{share.toFixed(0)}%</span>
                  </Motion>
                </div>
                <p class="mt-1 text-right text-xs font-medium text-muted-foreground tabular-nums">
                  {share.toFixed(1)}%
                </p>
              </Motion>
            )
          }}
        </For>
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Halaman Laporan                                                     */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()

  // Auth guard — sama seperti halaman app lain (Fase 2 mock).
  if (!isAuthenticated()) return <Navigate href="/login" />

  const toastProvider = ToastProvider()
  const toast: ToastApi = toastProvider.api

  const today = todayKey()

  const initialFrom = () => {
    const d = new Date()
    d.setDate(d.getDate() - (DASHBOARD_DAYS - 1))
    return toDateKey(d)
  }

  /** Outlet yang bisa dipilih: outlet milik user (auth mock) + demo. */
  const outlets = createMemo(() => {
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

  const [filters, setFilters] = createSignal<DashboardFiltersValue>({
    outletId: outlet()?.id ?? DEFAULT_OUTLET_ID,
    preset: '7d',
    from: initialFrom(),
    to: today,
  })

  const reportFilter = createMemo(() => ({
    outletId: filters().outletId,
    from: filters().from,
    to: filters().to,
  }))

  const outletId = createMemo(() => filters().outletId)

  const summary = useDashboardSummary(outletId)
  const lowStock = useLowStock(outletId)
  const bestSellers = useBestSellers(reportFilter)
  const busyHours = useBusyHours(reportFilter)
  const paymentBreakdown = usePaymentBreakdown(reportFilter)

  const activeOutlet = createMemo(
    () => outlets().find((o) => o.id === outletId()) ?? outlets()[0],
  )

  const rangeLabel = createMemo(() => {
    const f = filters()
    return f.from === f.to ? f.from : `${f.from} s/d ${f.to}`
  })

  /** Baris ringkasan dalam rentang filter (mock 7 hari penuh, difilter lokal). */
  const days = createMemo(() => {
    const f = filters()
    return (summary.data?.days ?? []).filter((d) => d.date >= f.from && d.date <= f.to)
  })

  const totals = createMemo(() => {
    const list = days()
    const omzet = list.reduce((s, d) => s + d.omzet, 0)
    const hpp = list.reduce((s, d) => s + d.hpp, 0)
    const laba = list.reduce((s, d) => s + d.laba, 0)
    const txCount = list.reduce((s, d) => s + d.txCount, 0)
    return {
      omzet,
      hpp,
      laba,
      txCount,
      margin: omzet > 0 ? (laba / omzet) * 100 : 0,
      avg: txCount > 0 ? omzet / txCount : 0,
    }
  })

  const anyPending = () =>
    summary.isPending ||
    lowStock.isPending ||
    bestSellers.isPending ||
    busyHours.isPending ||
    paymentBreakdown.isPending

  const anyError = () =>
    summary.isError ||
    lowStock.isError ||
    bestSellers.isError ||
    busyHours.isError ||
    paymentBreakdown.isError

  const errorMessage = () =>
    [
      summary.error?.message,
      bestSellers.error?.message,
      busyHours.error?.message,
      paymentBreakdown.error?.message,
      lowStock.error?.message,
    ].find(Boolean) ?? 'Terjadi kesalahan tak terduga.'

  /* ---- Export & print (Fase 2 mock; Fase 3: pdf-lib via backend) ---- */

  const printPdf = () => {
    // Fallback sederhana: print dialog browser → "Save as PDF".
    // Catatan Fase 3: diganti streaming `GET /reports/export?format=pdf`.
    toast.info('Gunakan opsi "Save as PDF" pada dialog cetak.')
    window.print()
  }

  const copySummary = async () => {
    const t = totals()
    const best = bestSellers.data?.items ?? []
    const lines = [
      `Laporan LarisPOS — ${activeOutlet().name}`,
      `Periode: ${rangeLabel()}`,
      '',
      `Omzet: ${formatIDR(t.omzet)}`,
      `HPP: ${formatIDR(t.hpp)}`,
      `Laba: ${formatIDR(t.laba)} (margin ${t.margin.toFixed(1)}%)`,
      `Transaksi: ${t.txCount} · rata-rata ${formatIDR(Math.round(t.avg))}`,
      '',
      'Top 5 best seller:',
      ...best.slice(0, 5).map((r, i) => `  ${i + 1}. ${r.variantName} — ${r.qty} pcs (${formatCompact(r.omzet)})`),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast.success('Ringkasan laporan disalin ke clipboard.')
    } catch {
      toast.error('Gagal menyalin — izin clipboard ditolak.')
    }
  }

  return (
    <SidebarLayout
      userLabel={user()?.businessName}
      outletName={activeOutlet().name}
      onLogout={() => logout()}
    >
      {toastProvider.view}

      <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Motion tag="div"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, easing: 'ease-out' }}
        >
          {/* Judul + aksi export */}
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="text-2xl font-extrabold tracking-tight text-foreground">
                Laporan
              </h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {activeOutlet().name} · {rangeLabel()}
              </p>
            </div>
            <div class="flex items-center gap-2 print:hidden">
              <Button variant="secondary" size="sm" onClick={() => copySummary()}>
                Copy ringkasan
              </Button>
              <Button size="sm" onClick={() => printPdf()}>
                Export PDF
              </Button>
            </div>
          </div>

          {/* Filter tanggal + outlet (reuse DashboardFilters) */}
          <div class="mt-6 print:hidden">
            <DashboardFilters value={filters()} onChange={setFilters} outlets={outlets()} />
          </div>

          <Show when={!anyPending()} fallback={<ReportSkeleton />}>
            <Show when={!anyError()} fallback={
              <ReportErrorState message={errorMessage()} onRetry={() => {
                void summary.refetch()
                void lowStock.refetch()
                void bestSellers.refetch()
                void busyHours.refetch()
                void paymentBreakdown.refetch()
              }} />
            }>
              <Show when={days().length > 0} fallback={<ReportEmptyState />}>
                {/* Ringkasan */}
                <section aria-label="Ringkasan laporan" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Motion tag="div"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, easing: 'ease-out' }}
                  >
                    <Card class="h-full">
                      <div class="p-5">
                        <p class="text-xs font-medium text-muted-foreground">Omzet</p>
                        <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                          {formatIDR(totals().omzet)}
                        </p>
                        <p class="mt-2 text-xs font-semibold text-emerald-700">
                          {days().length} hari tercatat
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
                        <p class="text-xs font-medium text-muted-foreground">HPP</p>
                        <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                          {formatIDR(totals().hpp)}
                        </p>
                        <p class="mt-2 text-xs text-muted-foreground">
                          {totals().omzet > 0
                            ? `${((totals().hpp / totals().omzet) * 100).toFixed(1)}% dari omzet`
                            : '—'}
                        </p>
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
                        <p class="text-xs font-medium text-muted-foreground">Laba bersih</p>
                        <p class="mt-2 text-2xl font-extrabold tracking-tight text-emerald-700 tabular-nums">
                          {formatIDR(totals().laba)}
                        </p>
                        <p class="mt-2 text-xs font-semibold text-muted-foreground">
                          Margin {totals().margin.toFixed(1)}%
                        </p>
                      </div>
                    </Card>
                  </Motion>
                  <Motion tag="div"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15, easing: 'ease-out' }}
                  >
                    <Card class="h-full">
                      <div class="p-5">
                        <p class="text-xs font-medium text-muted-foreground">Transaksi</p>
                        <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                          {totals().txCount} <span class="text-base font-bold text-muted-foreground">trx</span>
                        </p>
                        <p class="mt-2 text-xs text-muted-foreground">
                          Rata-rata {formatCompact(Math.round(totals().avg))}/trx
                        </p>
                      </div>
                    </Card>
                  </Motion>
                </section>

                {/* Grid 2 kolom: best sellers | jam ramai + metode bayar */}
                <div class="mt-6 grid gap-4 lg:grid-cols-2">
                  <Card hover={false} class="p-5">
                    <Show
                      when={bestSellers.data}
                      fallback={<ListRowSkeleton rows={8} class="mt-4" />}
                    >
                      {(data) => <BestSellersTable data={data()} />}
                    </Show>
                  </Card>

                  <div class="flex flex-col gap-4">
                    <Card hover={false} class="p-5">
                      <BusyHoursChart hours={busyHours.data ?? []} />
                    </Card>
                    <Card hover={false} class="p-5">
                      <PaymentBreakdownList rows={paymentBreakdown.data ?? []} />
                    </Card>
                  </div>
                </div>

                {/* Stok menipis (reuse LowStockCard) */}
                <section aria-label="Stok menipis" class="mt-6">
                  <LowStockCard
                    variants={lowStock.data ?? []}
                    outletName={activeOutlet().name}
                    isLoading={lowStock.isPending}
                  />
                </section>
              </Show>
            </Show>
          </Show>
        </Motion>
      </main>
    </SidebarLayout>
  )
}
