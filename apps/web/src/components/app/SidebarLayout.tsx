import { A, useLocation, useNavigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import type { ParentProps } from 'solid-js'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'

/**
 * SidebarLayout — navigasi utama web dashboard (PRD Flow 2, MASTER.md).
 *
 * - Desktop (lg+): sidebar kiri tetap 240px (w-60), surface putih + border.
 * - Mobile (<768px = <lg): top bar hamburger + drawer slide-in + overlay.
 * - Item aktif: bg primary-soft + teks primary + dot indikator.
 * - Footer: info user (nama bisnis + outlet) + tombol Keluar.
 *
 * Animasi (pos-motion): drawer slide-in transform 300ms, item nav stagger
 * FadeIn, aktif state primary-soft. prefers-reduced-motion → skip entrances.
 */

interface NavItem {
  href: string
  label: string
  icon: string
}

const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/cashier', label: 'Kasir', icon: 'cashier' },
  { href: '/products', label: 'Produk', icon: 'food' },
  { href: '/reports', label: 'Laporan', icon: 'chart' },
]

const SETTINGS_NAV: NavItem[] = [
  { href: '/outlets', label: 'Outlet', icon: 'store' },
  { href: '/staff', label: 'Staf', icon: 'users' },
  { href: '/payment-methods', label: 'Metode Bayar', icon: 'wallet' },
  { href: '/subscription', label: 'Langganan', icon: 'bolt' },
]

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export interface SidebarLayoutProps extends ParentProps {
  /** Nama bisnis (dari sesi auth mock). */
  userLabel?: string
  /** Nama outlet aktif — tampil di footer sidebar. */
  outletName?: string
  onLogout: () => void
}

/* ------------------------------------------------------------------ */
/* Brand + navigasi + footer (dipakai aside desktop & drawer mobile)   */
/* ------------------------------------------------------------------ */

function Brand() {
  return (
    <div class="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
      <span
        aria-hidden="true"
        class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-on-primary"
      >
        L
      </span>
      <span class="text-base font-extrabold tracking-tight text-foreground">
        Laris<span class="text-primary">POS</span>
      </span>
    </div>
  )
}

function NavLink(props: { item: NavItem; index: number; onNavigate?: () => void }) {
  const location = useLocation()
  const active = createMemo(() => isActivePath(location.pathname, props.item.href))

  return (
    <Motion tag="li"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(props.index * 0.03, 0.18), easing: 'ease-out' }}
    >
      <A
        href={props.item.href}
        onClick={props.onNavigate}
        aria-current={active() ? 'page' : undefined}
        class={[
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150',
          active()
            ? 'bg-primary-soft text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ].join(' ')}
      >
        <Icon name={props.item.icon} class="size-4.5 shrink-0" />
        <span class="min-w-0 truncate">{props.item.label}</span>
        <Show when={active()}>
          <span aria-hidden="true" class="ml-auto size-1.5 shrink-0 rounded-full bg-primary" />
        </Show>
      </A>
    </Motion>
  )
}

function SettingsGroup(props: { onNavigate?: () => void }) {
  const location = useLocation()
  const activeChild = createMemo(() =>
    SETTINGS_NAV.find((item) => isActivePath(location.pathname, item.href)),
  )
  // Buka otomatis saat salah satu anak aktif (rute Pengaturan).
  const [open, setOpen] = createSignal(Boolean(activeChild()))

  return (
    <li>
      <Motion tag="div"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: 0.15, easing: 'ease-out' }}
      >
        <button
          type="button"
          aria-expanded={open()}
          aria-controls="settings-subnav"
          onClick={() => setOpen((v) => !v)}
          class={[
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150',
            activeChild()
              ? 'bg-primary-soft text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          ].join(' ')}
        >
          <Icon name="sliders" class="size-4.5 shrink-0" />
          <span class="min-w-0 flex-1 truncate text-left">Pengaturan</span>
          <Icon
            name="chevron"
            class={[
              'size-4 shrink-0 transition-transform duration-200',
              open() ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        <Show when={open()}>
          <ul id="settings-subnav" class="ml-2 mt-1 space-y-1 border-l border-border pl-3">
            <For each={SETTINGS_NAV}>
              {(item, i) => <NavLink item={item} index={4 + i()} onNavigate={props.onNavigate} />}
            </For>
          </ul>
        </Show>
      </Motion>
    </li>
  )
}

function SidebarContent(props: {
  userLabel?: string
  outletName?: string
  onLogout: () => void
  onNavigate?: () => void
}) {
  const initial = () => (props.userLabel?.trim() ? props.userLabel!.trim()[0].toUpperCase() : 'O')

  return (
    <div class="flex h-full flex-col">
      <Brand />
      <nav aria-label="Navigasi utama" class="flex-1 overflow-y-auto px-3 py-4">
        <ul class="space-y-1">
          <For each={MAIN_NAV}>
            {(item, i) => <NavLink item={item} index={i()} onNavigate={props.onNavigate} />}
          </For>
          <SettingsGroup onNavigate={props.onNavigate} />
        </ul>
      </nav>
      <div class="space-y-3 border-t border-border p-4">
        <div class="flex items-center gap-3">
          <span
            aria-hidden="true"
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary"
          >
            {initial()}
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-foreground">
              {props.userLabel || 'Usaha Anda'}
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {props.outletName || 'Outlet'}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" fullWidth onClick={props.onLogout}>
          <Icon name="logout" class="size-4" />
          Keluar
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function SidebarLayout(props: SidebarLayoutProps) {
  const [drawerOpen, setDrawerOpen] = createSignal(false)
  const reduced = prefersReducedMotion()
  const navigate = useNavigate()

  function closeDrawer() {
    setDrawerOpen(false)
  }

  function handleLogout() {
    closeDrawer()
    props.onLogout()
    navigate('/login', { replace: true })
  }

  // Esc menutup drawer + scroll lock body saat drawer terbuka.
  createEffect(() => {
    if (!drawerOpen()) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  })

  const drawerPanel = () => (
    <div class="flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-2xl">
      <SidebarContent
        userLabel={props.userLabel}
        outletName={props.outletName}
        onLogout={handleLogout}
        onNavigate={closeDrawer}
      />
    </div>
  )

  return (
    <div class="min-h-dvh bg-background">
      {/* Sidebar desktop — tetap di kiri, 240px; drawer di bawah md (<768px) */}
      <aside class="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <SidebarContent
          userLabel={props.userLabel}
          outletName={props.outletName}
          onLogout={handleLogout}
        />
      </aside>

      {/* Top bar mobile — hamburger + brand */}
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          aria-label="Buka menu navigasi"
          onClick={() => setDrawerOpen(true)}
          class="flex size-10 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors duration-150 hover:bg-muted"
        >
          <Icon name="menu" class="size-5" />
        </button>
        <span
          aria-hidden="true"
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-on-primary"
        >
          L
        </span>
        <span class="text-base font-extrabold tracking-tight text-foreground">
          Laris<span class="text-primary">POS</span>
        </span>
      </header>

      {/* Drawer mobile — overlay + panel slide-in */}
      <Show when={drawerOpen()}>
        <div
          class="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <Motion tag="div"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, easing: 'ease-out' }}
            class="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <Motion tag="div"
            initial={reduced ? false : { opacity: 0, x: -288 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, easing: 'ease-out' }}
            class="absolute inset-y-0 left-0"
          >
            {drawerPanel()}
          </Motion>
        </div>
      </Show>

      {/* Konten — digeser 240px di desktop */}
      <div class="md:pl-60">
        <div class="flex min-h-dvh flex-col">{props.children}</div>
      </div>
    </div>
  )
}
