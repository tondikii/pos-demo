import { For, Show, createMemo } from 'solid-js'
import type { DateRangePreset } from '@larispos/shared'
import { toDateKey, type MockOutlet } from '../../lib/mocks'

export interface DashboardFiltersValue {
  outletId: string
  preset: DateRangePreset
  /** Rentang efektif — sama dengan preset, atau dari custom picker. */
  from: string
  to: string
}

export interface DashboardFiltersProps {
  value: DashboardFiltersValue
  onChange: (next: DashboardFiltersValue) => void
  /** Daftar outlet yang bisa dipilih (mock + outlet milik user). */
  outlets: MockOutlet[]
}

/** Normalisasi nilai <input type="date"> — kosong → tanggal hari ini. */
function normalizeDate(raw: string): string {
  return raw || toDateKey(new Date())
}

export function DashboardFilters(props: DashboardFiltersProps) {
  const presets: ReadonlyArray<{ id: DateRangePreset; label: string }> = [
    { id: 'today', label: 'Hari ini' },
    { id: '7d', label: '7 hari' },
    { id: 'custom', label: 'Custom' },
  ]

  const value = () => props.value

  const presetOptions = createMemo(() =>
    presets.filter((p) => p.id !== 'custom' || value().preset === 'custom'),
  )

  const isCustom = () => value().preset === 'custom'

  const selectOptions = () => props.outlets.map((o) => ({ value: o.id, label: o.name }))

  const setPreset = (preset: DateRangePreset) => {
    const now = new Date()
    const today = toDateKey(now)
    if (preset === 'today') {
      props.onChange({ ...value(), preset, from: today, to: today })
    } else if (preset === '7d') {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      props.onChange({ ...value(), preset, from: toDateKey(from), to: today })
    } else {
      // custom — pertahankan rentang sebelumnya bila belum di-set
      props.onChange({ ...value(), preset })
    }
  }

  const setCustomFrom = (raw: string) => {
    const from = normalizeDate(raw)
    const next = { ...value(), preset: 'custom' as const, from }
    if (next.to < from) next.to = from
    props.onChange(next)
  }

  const setCustomTo = (raw: string) => {
    const to = normalizeDate(raw)
    const next = { ...value(), preset: 'custom' as const, to }
    if (next.from > to) next.from = to
    props.onChange(next)
  }

  return (
    <div class="flex flex-wrap items-center gap-2">
      <label class="sr-only" for="filter-outlet">
        Pilih outlet
      </label>
      <select
        id="filter-outlet"
        value={value().outletId}
        onChange={(e) => props.onChange({ ...value(), outletId: e.currentTarget.value })}
        class={[
          'h-10 rounded-xl border bg-card px-3 text-sm font-medium text-foreground',
          'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          'cursor-pointer transition-colors duration-150',
        ].join(' ')}
      >
        <For each={selectOptions()}>
          {(o) => <option value={o.value}>{o.label}</option>}
        </For>
      </select>

      <div role="group" aria-label="Rentang tanggal" class="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        <For each={presetOptions()}>
          {(p) => (
            <button
              type="button"
              onClick={() => setPreset(p.id)}
              aria-pressed={value().preset === p.id}
              class={[
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                value().preset === p.id
                  ? 'bg-primary text-on-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              {p.label}
            </button>
          )}
        </For>
      </div>

      <Show when={isCustom()}>
        <div class="flex items-center gap-2">
          <label class="sr-only" for="filter-from">
            Dari tanggal
          </label>
          <input
            id="filter-from"
            type="date"
            value={value().from}
            max={value().to}
            onInput={(e) => setCustomFrom(e.currentTarget.value)}
            class={[
              'h-10 rounded-xl border bg-card px-3 text-sm text-foreground',
              'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              'transition-colors duration-150',
            ].join(' ')}
          />
          <span aria-hidden="true" class="text-xs text-muted-foreground">
            s/d
          </span>
          <label class="sr-only" for="filter-to">
            Sampai tanggal
          </label>
          <input
            id="filter-to"
            type="date"
            value={value().to}
            min={value().from}
            onInput={(e) => setCustomTo(e.currentTarget.value)}
            class={[
              'h-10 rounded-xl border bg-card px-3 text-sm text-foreground',
              'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              'transition-colors duration-150',
            ].join(' ')}
          />
        </div>
      </Show>
    </div>
  )
}
