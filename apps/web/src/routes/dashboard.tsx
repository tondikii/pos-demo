import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { DASHBOARD_DAYS } from '@larispos/shared'
import type { DateRangePreset } from '@larispos/shared'
import { AppHeader } from '../components/app/AppHeader'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { EmptyState, ErrorState, StatSkeletonCard } from '../components/ui/state'
import { StatCard } from '../components/dashboard/StatCard'
import { DashboardFilters, type DashboardFiltersValue } from '../components/dashboard/DashboardFilters'
import { OmzetChart } from '../components/dashboard/OmzetChart'
import { LowStockCard } from '../components/dashboard/LowStockCard'
import { useAuth } from '../lib/auth-mock'
import {
  DEFAULT_OUTLET_ID,
  MOCK_OUTLETS,
  findDay,
  todaySummary,
  toDateKey,
} from '../lib/mocks'
import { useDashboardSummary, useLowStock } from '../lib/queries'
import { formatIDR, formatCompact, formatDayLabel } from '../lib/format'

function DashboardSkeleton() {
  return (
    <div aria-busy="true" class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-3">
        <For each={[0, 1, 2]}>
          {() => <StatSkeletonCard />}
        </For>
      </div>
      <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div class="animate-pulse rounded-2xl border border-border bg-card p-5">
          <div class="h-4 w-32 rounded bg-muted" />
          <div class="mt-6 flex h-44 items-end gap-3">
            <For each={[0, 1, 2, 3, 4, 5, 6]}>
              {(_) => <div class="h-24 flex-1 rounded-t-md bg-muted" />}
            </For>
          </div>
        </div>
        <div class="animate-pulse rounded-2xl border border-border bg-card p-5">
          <div class="h-4 w-24 rounded bg-muted" />
          <div class="mt-4 space-y-3">
            <For each={[0, 1, 2, 3]}>
              {(_) => <div class="h-11 rounded-lg bg-muted" />}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()

  // Auth guard — Fase 2 mock, redirect ke login bila belum ada sesi.
  if (!isAuthenticated()) return <Navigate href="/login" />

  const today = toDateKey(new Date())

  const initialFrom = () => {
    const d = new Date()
    d.setDate(d.getDate() - (DASHBOARD_DAYS - 1))
    return toDateKey(d)
  }

  /**
   * Outlet yang bisa dipilih: outlet milik user (dari auth mock, id pendek)
   * + outlet demo deterministik. Di-dedup per id agar tidak ganda.
   */
  const outlets = createMemo<Array<{ id: string; name: string; address: string }>>(() => {
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

  const outletId = createMemo(() => filters().outletId)

  const summary = useDashboardSummary(outletId)
  const lowStock = useLowStock(outletId)

  const activeOutlet = createMemo(
    () => outlets().find((o) => o.id === outletId()) ?? outlets()[0],
  )

  /** 7 hari penuh dari mock — kartu statistik selalu pakai baris "hari ini". */
  const allDays = createMemo(() => summary.data?.days ?? [])

  /** Baris dalam rentang filter — untuk grafik & tabel rincian. */
  const days = createMemo(() => {
    const f = filters()
    return allDays().filter((d) => d.date >= f.from && d.date <= f.to)
  })

  // Kartu statistik — nilai "hari ini" (data live tanggal runtime).
  const todayRow = createMemo(() => todaySummary(allDays()))

  const prevRow = createMemo(() => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    return findDay(allDays(), toDateKey(y))
  })

  const omzetToday = createMemo(() => todayRow()?.omzet ?? 0)
  const labaToday = createMemo(() => todayRow()?.laba ?? 0)
  const txToday = createMemo(() => todayRow()?.txCount ?? 0)

  const omzetDelta = createMemo(() => {
    const prev = prevRow()?.omzet
    if (prev === undefined || prev === null || prev <= 0) return null
    return ((omzetToday() - prev) / prev) * 100
  })
  const txDelta = createMemo(() => {
    const prev = prevRow()?.txCount
    if (prev === undefined || prev === null || prev === 0) return null
    return ((txToday() - prev) / prev) * 100
  })

  const marginPct = createMemo(() => {
    const omzet = omzetToday()
    if (omzet <= 0) return 0
    return (labaToday() / omzet) * 100
  })

  const presetLabel: Record<DateRangePreset, string> = {
    today: 'Hari ini',
    '7d': '7 hari terakhir',
    custom: 'Rentang custom',
  }

  return (
    <div class="min-h-dvh bg-background">
      <AppHeader userLabel={user()?.businessName} onLogout={() => logout()} />

      <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Motion tag="div"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, easing: 'ease-out' }}
        >
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="text-2xl font-extrabold tracking-tight text-foreground">
                Halo, {user()?.businessName ?? 'Owner'}
              </h1>
              <p class="mt-1 text-sm text-muted-foreground">
                Ringkasan usaha Anda — {presetLabel[filters().preset]}
              </p>
            </div>
            <DashboardFilters value={filters()} onChange={setFilters} outlets={outlets()} />
          </div>

          <Show
            when={!summary.isPending}
            fallback={<div class="mt-6"><DashboardSkeleton /></div>}
          >
            <Show
              when={!summary.isError}
              fallback={
                <div class="mt-6">
                  <ErrorState
                    title="Gagal memuat data dashboard"
                    message={summary.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                    onRetry={() => summary.refetch()}
                  />
                </div>
              }
            >
              <Show
                when={days().length > 0}
                fallback={
                  <div class="mt-6">
                    <EmptyState
                      icon="chart"
                      title="Belum ada data pada rentang ini"
                      description="Tidak ada transaksi pada rentang tanggal yang dipilih. Coba rentang lain atau outlet lain."
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setFilters({ ...filters(), preset: '7d', from: initialFrom(), to: today })}
                        >
                          Kembali ke 7 hari terakhir
                        </Button>
                      }
                    />
                  </div>
                }
              >
                <section aria-label="Ringkasan hari ini" class="mt-6 grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label="Omzet hari ini"
                    value={formatIDR(omzetToday())}
                    delta={
                      omzetDelta() !== null
                        ? `${omzetDelta()! >= 0 ? '+' : ''}${omzetDelta()!.toFixed(0)}% vs kemarin`
                        : undefined
                    }
                    tone={omzetDelta() !== null ? (omzetDelta()! >= 0 ? 'up' : 'down') : 'flat'}
                    accent="primary"
                    index={0}
                  />
                  <StatCard
                    label="Laba hari ini"
                    value={formatIDR(labaToday())}
                    delta={`Margin ${marginPct().toFixed(1)}%`}
                    tone="flat"
                    accent="emerald"
                    index={1}
                  />
                  <StatCard
                    label="Transaksi hari ini"
                    value={`${txToday()} trx`}
                    delta={
                      txDelta() !== null
                        ? `${txDelta()! >= 0 ? '+' : ''}${txDelta()!.toFixed(0)}% vs kemarin`
                        : undefined
                    }
                    tone={txDelta() !== null ? (txDelta()! >= 0 ? 'up' : 'down') : 'flat'}
                    accent="violet"
                    index={2}
                  />
                </section>

                <div class="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
                  <Card hover={false} class="p-5">
                    <OmzetChart days={days()} from={filters().from} to={filters().to} />
                  </Card>
                  <LowStockCard
                    variants={lowStock.data ?? []}
                    outletName={activeOutlet().name}
                    isLoading={lowStock.isPending}
                  />
                </div>

                {/* Rincian harian — tabel di md+, kartu di mobile */}
                <section aria-label="Rincian harian" class="mt-6">
                  <div class="rounded-2xl border border-border bg-card shadow-sm">
                    <div class="border-b border-border p-5 pb-3">
                      <h2 class="text-base font-bold text-foreground">Rincian harian</h2>
                      <p class="mt-0.5 text-sm text-muted-foreground">
                        {activeOutlet().name}
                      </p>
                    </div>

                    {/* Tabel — md ke atas */}
                    <div class="hidden overflow-x-auto md:block">
                      <table class="w-full text-left text-sm">
                        <thead>
                          <tr class="border-b border-border text-xs text-muted-foreground">
                            <th scope="col" class="px-5 py-3 font-semibold">Tanggal</th>
                            <th scope="col" class="px-5 py-3 text-right font-semibold">Omzet</th>
                            <th scope="col" class="px-5 py-3 text-right font-semibold">HPP</th>
                            <th scope="col" class="px-5 py-3 text-right font-semibold">Laba</th>
                            <th scope="col" class="px-5 py-3 text-right font-semibold">Trx</th>
                            <th scope="col" class="px-5 py-3 text-right font-semibold">Rata-rata</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                          <For each={days()}>
                            {(d) => (
                              <tr class="transition-colors duration-150 hover:bg-muted/50">
                                <td class="px-5 py-3 font-medium text-foreground">
                                  {formatDayLabel(d.date, today)}
                                </td>
                                <td class="px-5 py-3 text-right font-semibold text-foreground tabular-nums">
                                  {formatIDR(d.omzet)}
                                </td>
                                <td class="px-5 py-3 text-right text-muted-foreground tabular-nums">
                                  {formatIDR(d.hpp)}
                                </td>
                                <td class="px-5 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                                  {formatIDR(d.laba)}
                                </td>
                                <td class="px-5 py-3 text-right text-muted-foreground tabular-nums">
                                  {d.txCount}
                                </td>
                                <td class="px-5 py-3 text-right text-muted-foreground tabular-nums">
                                  {formatCompact(d.avg)}
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                        <tfoot>
                          <tr class="border-t border-border bg-muted/40">
                            <td class="px-5 py-3 text-sm font-bold text-foreground">Total</td>
                            <td class="px-5 py-3 text-right font-bold text-foreground tabular-nums">
                              {formatIDR(days().reduce((s, d) => s + d.omzet, 0))}
                            </td>
                            <td class="px-5 py-3 text-right text-muted-foreground tabular-nums">
                              {formatIDR(days().reduce((s, d) => s + d.hpp, 0))}
                            </td>
                            <td class="px-5 py-3 text-right font-bold text-emerald-700 tabular-nums">
                              {formatIDR(days().reduce((s, d) => s + d.laba, 0))}
                            </td>
                            <td class="px-5 py-3 text-right text-muted-foreground tabular-nums">
                              {days().reduce((s, d) => s + d.txCount, 0)}
                            </td>
                            <td class="px-5 py-3 text-right text-muted-foreground tabular-nums">
                              {formatCompact(
                                days().reduce((s, d) => s + d.avg, 0) / Math.max(days().length, 1),
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Kartu — mobile (di bawah md) */}
                    <ul class="divide-y divide-border md:hidden">
                      <For each={days()}>
                        {(d) => (
                          <li class="px-5 py-3.5">
                            <div class="flex items-baseline justify-between gap-3">
                              <p class="text-sm font-bold text-foreground">
                                {formatDayLabel(d.date, today)}
                              </p>
                              <p class="text-sm font-bold text-foreground tabular-nums">
                                {formatIDR(d.omzet)}
                              </p>
                            </div>
                            <dl class="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <div class="flex gap-4">
                                <span>
                                  HPP{' '}
                                  <span class="font-semibold text-foreground tabular-nums">
                                    {formatIDR(d.hpp)}
                                  </span>
                                </span>
                                <span>
                                  Laba{' '}
                                  <span class="font-semibold text-emerald-700 tabular-nums">
                                    {formatIDR(d.laba)}
                                  </span>
                                </span>
                              </div>
                              <span class="shrink-0 tabular-nums">
                                {d.txCount} trx · {formatCompact(d.avg)}
                              </span>
                            </dl>
                          </li>
                        )}
                      </For>
                      <li class="flex items-center justify-between gap-3 bg-muted/40 px-5 py-3">
                        <span class="text-sm font-bold text-foreground">Total</span>
                        <span class="text-sm font-bold text-foreground tabular-nums">
                          {formatIDR(days().reduce((s, d) => s + d.omzet, 0))}
                        </span>
                      </li>
                    </ul>
                  </div>
                </section>
              </Show>
            </Show>
          </Show>
        </Motion>
      </main>
    </div>
  )
}
