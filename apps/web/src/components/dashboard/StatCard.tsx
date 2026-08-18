import { Motion } from '@motionone/solid'
import type { ParentProps } from 'solid-js'
import { Card } from '../ui/card'

export type StatTone = 'up' | 'down' | 'flat'

export interface StatCardProps extends ParentProps {
  label: string
  /** Nilai utama (mis. Rp 2,4 jt) — string bebas, sudah diformat caller. */
  value: string
  /** Label delta (mis. "+12% vs kemarin"). */
  delta?: string
  tone?: StatTone
  /** Tanda visual pembeda (warna titik/ikon kiri atas). */
  accent?: 'primary' | 'emerald' | 'amber' | 'violet'
  /** Indeks stagger entrace (delay = index * 60ms). */
  index?: number
}

const TONE_ICON: Record<StatTone, { glyph: string; class: string }> = {
  up: { glyph: '↑', class: 'bg-emerald-500/10 text-emerald-700' },
  down: { glyph: '↓', class: 'bg-red-500/10 text-destructive' },
  flat: { glyph: '→', class: 'bg-muted text-muted-foreground' },
}

const ACCENT_DOT: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primary',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
}

export function StatCard(props: StatCardProps) {
  const tone = () => props.tone ?? 'flat'
  const accent = () => props.accent ?? 'primary'
  const idx = () => props.index ?? 0
  const toneIcon = () => TONE_ICON[tone()]
  const delay = () => (idx() * 60) / 1000

  return (
    <Motion tag="div"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay(), easing: 'ease-out' }}
    >
      <Card class="h-full">
        <div class="p-5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-medium text-muted-foreground">{props.label}</p>
            <span aria-hidden="true" class={`size-1.5 shrink-0 rounded-full ${ACCENT_DOT[accent()]}`} />
          </div>

          <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
            {props.value}
          </p>

          <div class="mt-2 flex items-center gap-1.5">
            {props.delta ? (
              <>
                <span
                  aria-hidden="true"
                  class={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${toneIcon().class}`}
                >
                  {toneIcon().glyph}
                </span>
                <span
                  class={[
                    'text-xs font-semibold',
                    tone() === 'up'
                      ? 'text-emerald-700'
                      : tone() === 'down'
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {props.delta}
                </span>
              </>
            ) : (
              <span class="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </Card>
    </Motion>
  )
}
