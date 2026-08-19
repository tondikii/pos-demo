import { A } from '@solidjs/router'
import type { JSX, ParentProps } from 'solid-js'
import { Button } from '../ui/button'

export interface AppHeaderProps extends ParentProps {
  userLabel?: string
  onLogout: () => void
  /** Aksi kontekstual halaman (mis. tombol "Tambah produk"). */
  actions?: JSX.Element
}

/**
 * Header halaman (app) — dipakai di dalam SidebarLayout untuk konten.
 * Tidak memuat navigasi utama (sidebar yang pegang), cukup judul + aksi.
 */
export function AppHeader(props: AppHeaderProps) {
  return (
    <header class="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div class="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div class="flex min-w-0 items-center gap-2.5">
          <A
            href="/dashboard"
            aria-label="Ke dashboard"
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-on-primary"
          >
            L
          </A>
          <span class="hidden max-w-44 truncate text-xs text-muted-foreground lg:block">
            {props.userLabel ?? 'Usaha Anda'}
          </span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          {props.actions}
          <Button variant="secondary" size="sm" onClick={() => props.onLogout()}>
            Keluar
          </Button>
        </div>
      </div>
    </header>
  )
}
