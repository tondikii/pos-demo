import { A } from '@solidjs/router'
import { createSignal, For, Show } from 'solid-js'
import type { JSX, ParentProps } from 'solid-js'
import { Button } from '../ui/button'
import { isMockErrorEnabled, setMockErrorEnabled } from '../../lib/mocks'

export interface AppNavItem {
  href: string
  label: string
  end?: boolean
}

export interface AppHeaderProps extends ParentProps {
  userLabel?: string
  onLogout: () => void
  /** Nav item tambahan di kanan (mis. tombol aksi halaman). */
  actions?: JSX.Element
}

const DEFAULT_NAV: AppNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', end: true },
  { href: '/products', label: 'Produk' },
  { href: '/reports', label: 'Laporan' },
  { href: '/shifts', label: 'Shifts' },
  { href: '/outlets', label: 'Outlet' },
  { href: '/staff', label: 'Staff' },
  { href: '/payment-methods', label: 'Pembayaran' },
  { href: '/subscription', label: 'Langganan' },
]

/**
 * Header sticky bersama untuk halaman (app) dashboard.
 * - Nav aktif mengikuti route; di layar kecil nav scroll horizontal (tanpa
 *   hamburger custom — tetap satu baris, tidak ada lib tambahan).
 * - Toggle "Simulasi error" (demo 2A.7): mengaktifkan/mematikan error mock
 *   untuk verifikasi error state seluruh halaman, lalu memuat ulang.
 */
export function AppHeader(props: AppHeaderProps) {
  const [mockError, setMockError] = createSignal(isMockErrorEnabled())

  function toggleMockError() {
    const next = !mockError()
    setMockError(next)
    setMockErrorEnabled(next)
    // Muat ulang agar semua query cache dibersihkan & state konsisten.
    window.location.reload()
  }

  return (
    <header class="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div class="flex min-w-0 items-center gap-2.5">
          <A
            href="/dashboard"
            aria-label="Ke dashboard"
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-on-primary"
          >
            L
          </A>
          {/* Nav scroll-x di mobile, penuh di sm+ — tanpa hamburger custom. */}
          <nav
            aria-label="Navigasi utama"
            class="flex min-w-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <For each={DEFAULT_NAV}>
              {(item) => (
                <A
                  href={item.href}
                  end={item.end}
                  inactiveClass="text-muted-foreground hover:bg-muted hover:text-foreground"
                  activeClass="bg-muted text-foreground"
                  class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150"
                >
                  {item.label}
                </A>
              )}
            </For>
          </nav>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          {props.actions}
          <button
            type="button"
            aria-pressed={mockError()}
            title={
              mockError()
                ? 'Simulasi error aktif — semua query akan gagal'
                : 'Aktifkan simulasi error untuk verifikasi error state'
            }
            onClick={() => toggleMockError()}
            class={[
              'hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 sm:inline-flex',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              mockError()
                ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              class={['size-1.5 rounded-full', mockError() ? 'bg-destructive' : 'bg-slate-400'].join(' ')}
            />
            Simulasi error
          </button>
          <Show when={mockError()}>
            <span class="sr-only" role="status">
              Simulasi error aktif — query akan gagal
            </span>
          </Show>
          <span class="hidden max-w-40 truncate text-xs text-muted-foreground lg:block">
            {props.userLabel ?? 'Owner'}
          </span>
          <Button variant="secondary" size="sm" onClick={() => props.onLogout()}>
            Keluar
          </Button>
        </div>
      </div>
    </header>
  )
}
