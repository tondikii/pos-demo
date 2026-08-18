import { For, Show } from 'solid-js'
import type { JSX, ParentProps } from 'solid-js'
import { Button } from './button'
import { Card } from './card'

/* ------------------------------------------------------------------ */
/* EmptyState — pola konsisten: emoji ikon + judul + deskripsi + CTA   */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps extends ParentProps {
  /** Emoji dekoratif (aria-hidden) — ukuran konsisten 12. */
  icon?: string
  title: string
  description: string
  /** Tombol aksi utama. */
  action?: JSX.Element
  /** Ringkas untuk area kecil (padding/konten lebih ramping). */
  compact?: boolean
  class?: string
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div
      class={[
        'rounded-2xl border border-dashed border-border bg-card text-center',
        props.compact ? 'px-6 py-8' : 'px-6 py-10 sm:px-10',
        props.class ?? '',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        class={[
          'mx-auto flex items-center justify-center rounded-full bg-muted',
          props.compact ? 'size-10 text-lg' : 'size-12 text-xl',
        ].join(' ')}
      >
        {props.icon ?? '📭'}
      </div>
      <p class="mt-4 text-sm font-semibold text-foreground">{props.title}</p>
      <p class="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {props.description}
      </p>
      <Show when={props.action}>
        <div class="mt-5">{props.action}</div>
      </Show>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ErrorState — card error + tombol Retry (refetch)                    */
/* ------------------------------------------------------------------ */

export interface ErrorStateProps {
  title: string
  message?: string
  onRetry: () => void
  retryLabel?: string
  /** Container margin atas — konsisten antar halaman. */
  class?: string
}

export function ErrorState(props: ErrorStateProps) {
  return (
    <div
      role="alert"
      class={[
        'rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center',
        props.class ?? '',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        class="mx-auto flex size-11 items-center justify-center rounded-full bg-destructive/10 text-xl"
      >
        ⚠️
      </div>
      <p class="mt-3 text-sm font-semibold text-destructive">{props.title}</p>
      <Show when={props.message}>
        <p class="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
          {props.message}
        </p>
      </Show>
      <Button class="mt-4" variant="secondary" size="sm" onClick={() => props.onRetry()}>
        {props.retryLabel ?? 'Coba lagi'}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Skeleton — blok shimmer seragam (aria-busy)                         */
/* ------------------------------------------------------------------ */

export function SkeletonBlock(props: { class?: string }) {
  return (
    <div
      aria-hidden="true"
      class={['animate-pulse rounded-lg bg-muted', props.class ?? 'h-4'].join(' ')}
    />
  )
}

/** Kartu statistik skeleton — dipakai dashboard & laporan. */
export function StatSkeletonCard(props: { class?: string }) {
  return (
    <div class={['animate-pulse rounded-2xl border border-border bg-card p-5', props.class ?? ''].join(' ')}>
      <SkeletonBlock class="h-3 w-24" />
      <SkeletonBlock class="mt-3 h-7 w-28" />
      <SkeletonBlock class="mt-3 h-3 w-20" />
    </div>
  )
}

/** Baris list skeleton — dipakai best sellers / shift / riwayat. */
export function ListRowSkeleton(props: { rows?: number; class?: string }) {
  return (
    <div aria-busy="true" class={['space-y-2.5', props.class ?? ''].join(' ')}>
      <For each={Array.from({ length: props.rows ?? 5 })}>
        {() => (
          <div class="flex items-center gap-3">
            <SkeletonBlock class="size-6 shrink-0 rounded-full" />
            <SkeletonBlock class="h-4 flex-1" />
            <SkeletonBlock class="h-4 w-16" />
          </div>
        )}
      </For>
    </div>
  )
}

/** Grid kartu skeleton — dipakai produk / outlet / staff / metode bayar. */
export function CardGridSkeleton(props: { count?: number; class?: string }) {
  return (
    <div
      aria-busy="true"
      class={['grid gap-4 sm:grid-cols-2 lg:grid-cols-3', props.class ?? ''].join(' ')}
    >
      <For each={Array.from({ length: props.count ?? 6 })}>
        {() => (
          <Card class="p-5">
            <div class="flex items-center justify-between gap-2">
              <SkeletonBlock class="h-4 w-32" />
              <SkeletonBlock class="h-5 w-14 rounded-full" />
            </div>
            <SkeletonBlock class="mt-3 h-3 w-40" />
            <SkeletonBlock class="mt-4 h-8" />
            <SkeletonBlock class="mt-2 h-8" />
          </Card>
        )}
      </For>
    </div>
  )
}

export { Card }
