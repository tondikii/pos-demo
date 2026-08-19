import { Motion } from '@motionone/solid'
import { For, Show } from 'solid-js'
import type { MockLowStockVariant } from '../../lib/mocks'
import { Icon } from '../ui/icon'

export interface LowStockCardProps {
  variants: MockLowStockVariant[]
  outletName?: string
  isLoading?: boolean
}

export function LowStockCard(props: LowStockCardProps) {
  return (
    <div class="rounded-2xl border border-border bg-card shadow-sm">
      <div class="border-b border-border p-5 pb-3">
        <h2 class="text-base font-bold text-foreground">Stok menipis</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">
          {props.outletName ?? 'Semua outlet'} · stok ≤ batas per varian
        </p>
      </div>

      <Show
        when={!props.isLoading}
        fallback={
          <div class="space-y-3 p-5" aria-busy="true">
            <For each={[0, 1, 2, 3]}>
              {(i) => (
                <div class="animate-pulse rounded-lg bg-muted" style={{ height: '2.75rem', opacity: 1 - i * 0.18 }} />
              )}
            </For>
          </div>
        }
      >
        <Show
          when={props.variants.length > 0}
          fallback={
            <div class="flex flex-col items-center px-5 py-6 text-center">
              <span aria-hidden="true" class="flex size-10 items-center justify-center rounded-full bg-muted text-lg">
                <Icon name="check" class="size-4 text-emerald-500" />
              </span>
              <p class="mt-3 text-sm font-semibold text-foreground">Stok aman</p>
              <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Tidak ada varian menipis saat ini.
              </p>
            </div>
          }
        >
          <ul class="divide-y divide-border">
            <For each={props.variants}>
              {(v, i) => {
                const habis = v.stock <= 0
                const tone = habis
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-amber-500/10 text-amber-700'
                return (
                  <Motion tag="li"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: (i() * 60) / 1000, easing: 'ease-out' }}
                    class="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-foreground">
                        {v.productName} <span class="font-normal text-muted-foreground">— {v.variantName}</span>
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        {v.category} · sisa {v.stock} dari batas {v.lowStockThreshold}
                      </p>
                    </div>
                    <span
                      class={[
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                        tone,
                      ].join(' ')}
                    >
                      {habis ? 'Habis' : 'Menipis'}
                    </span>
                  </Motion>
                )
              }}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  )
}
