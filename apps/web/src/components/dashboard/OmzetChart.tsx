import { Motion } from '@motionone/solid'
import { createMemo, For, Show } from 'solid-js'
import type { MockOutletSummary } from '../../lib/mocks'
import { formatCompact, formatDayLabel } from '../../lib/format'
import { todayKey } from '../../lib/queries'

export interface OmzetChartProps {
  days: MockOutletSummary[]
  /** Rentang yang sedang difilter (untuk label "Hari ini"). */
  from: string
  to: string
}

const BAR_MIN_HEIGHT = 4 // % — agar bar dengan nilai 0 tetap terlihat

export function OmzetChart(props: OmzetChartProps) {
  const today = todayKey()

  const maxOmzet = createMemo(() =>
    props.days.reduce((max, d) => Math.max(max, d.omzet), 0),
  )

  const bars = createMemo(() =>
    props.days.map((d) => {
      const pct = maxOmzet() > 0 ? (d.omzet / maxOmzet()) * 100 : 0
      return {
        ...d,
        pct: Math.max(pct, BAR_MIN_HEIGHT),
        isToday: d.date === today,
      }
    }),
  )

  const sparklinePoints = createMemo(() => {
    const points = props.days.map((d, i) => ({
      x: i,
      y: maxOmzet() > 0 ? 1 - d.omzet / maxOmzet() : 0.5,
    }))
    return points
      .map((p, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * 100
        return `${x},${(p.y * 100).toFixed(2)}`
      })
      .join(' ')
  })

  const trendPct = createMemo(() => {
    if (props.days.length < 2) return null
    const first = props.days[0].omzet
    const last = props.days[props.days.length - 1].omzet
    if (first <= 0) return null
    return ((last - first) / first) * 100
  })

  const todaySummary = createMemo(
    () => props.days.find((d) => d.date === today) ?? null,
  )

  return (
    <div>
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-base font-bold text-foreground">Omzet harian</h2>
        <Show when={trendPct() !== null}>
          <span
            class={[
              'text-xs font-semibold',
              (trendPct() ?? 0) >= 0 ? 'text-emerald-700' : 'text-destructive',
            ].join(' ')}
          >
            {trendPct() !== null && trendPct()! >= 0 ? '+' : ''}
            {trendPct() !== null ? `${trendPct()!.toFixed(0)}%` : ''} vs awal periode
          </span>
        </Show>
      </div>

      <p class="mt-1 text-sm text-muted-foreground">
        {props.from === props.to
          ? formatDayLabel(props.from, today)
          : `${formatDayLabel(props.from, today)} — ${formatDayLabel(props.to, today)}`}
      </p>

      <div class="mt-6 flex h-44 items-end gap-2 sm:h-52 sm:gap-3">
        <For each={bars()}>
          {(bar, i) => (
            <div class="group relative flex h-full flex-1 flex-col justify-end">
              {/* tooltip */}
              <div
                role="tooltip"
                class="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2 py-1 text-center opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
              >
                <p class="whitespace-nowrap text-[11px] font-bold text-foreground tabular-nums">
                  {formatCompact(bar.omzet)}
                </p>
                <p class="whitespace-nowrap text-[10px] text-muted-foreground">
                  {bar.txCount} transaksi
                </p>
              </div>

              <Motion tag="div"
                initial={{ opacity: 0, scaleY: 0.2 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.4, delay: i() * 0.05, easing: 'ease-out' }}
                class={[
                  'origin-bottom rounded-t-md transition-colors duration-150',
                  bar.isToday
                    ? 'bg-primary group-hover:bg-blue-600'
                    : 'bg-primary/25 group-hover:bg-primary/45',
                ].join(' ')}
                style={{ height: `${bar.pct}%` }}
              >
                <span class="sr-only">{formatDayLabel(bar.date, today)}: omzet {formatCompact(bar.omzet)}</span>
              </Motion>
            </div>
          )}
        </For>
      </div>

      <div class="mt-2 flex gap-2 sm:gap-3">
        <For each={bars()}>
          {(bar) => (
            <div class="flex-1 text-center">
              <span
                class={[
                  'text-[10px] font-medium sm:text-xs',
                  bar.isToday ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {formatDayLabel(bar.date, today)}
              </span>
            </div>
          )}
        </For>
      </div>

      <div class="mt-6 rounded-xl border border-border bg-card p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-muted-foreground">
            Tren omzet
          </p>
          <Show when={todaySummary()}>
            <p class="text-xs font-semibold text-foreground tabular-nums">
              Hari ini {formatCompact(todaySummary()!.omzet)}
            </p>
          </Show>
        </div>
        <svg
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          class="mt-2 h-10 w-full"
          role="img"
          aria-label="Grafik garis tren omzet 7 hari terakhir"
        >
          <polyline
            points={sparklinePoints()}
            fill="none"
            stroke="var(--color-primary)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
          <polygon
            points={`0,32 ${sparklinePoints()} 100,32`}
            fill="var(--color-primary)"
            opacity="0.08"
          />
        </svg>
      </div>
    </div>
  )
}
