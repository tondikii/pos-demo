import type { ParentProps } from 'solid-js'
import { PLANS } from '@larispos/shared'

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function LogoLaris(props: { dark?: boolean }) {
  const badge = props.dark
    ? 'bg-white text-brand-900'
    : 'bg-primary text-on-primary'
  return (
    <div class="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        class={`flex size-9 items-center justify-center rounded-xl text-lg font-extrabold ${badge}`}
      >
        L
      </span>
      <span class={`text-lg font-extrabold tracking-tight ${props.dark ? 'text-white' : 'text-foreground'}`}>
        Laris<span class={props.dark ? 'text-orange-400' : 'text-primary'}>POS</span>
      </span>
    </div>
  )
}

function CheckItem(props: { children: string }) {
  return (
    <li class="flex items-start gap-3">
      <span
        aria-hidden="true"
        class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400"
      >
        <svg viewBox="0 0 16 16" fill="none" class="size-3.5" stroke="currentColor" stroke-width="2">
          <path d="M3 8.5 6.5 12 13 4.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="text-sm leading-relaxed text-slate-300">{props.children}</span>
    </li>
  )
}

/**
 * AuthLayout — 2 kolom: panel brand gelap (value prop + harga dari PLANS)
 * di kiri (hidden di mobile), card form di kanan.
 */
export default function AuthLayout(props: ParentProps) {
  const starter = PLANS.starter
  const tumbuh = PLANS.tumbuh

  return (
    <div class="flex min-h-dvh bg-background">
      {/* Panel brand — dark, hanya lg ke atas */}
      <aside class="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-brand-950 p-10 lg:flex xl:p-12">
        {/* dekorasi */}
        <div aria-hidden="true" class="pointer-events-none absolute inset-0">
          <div class="absolute -top-24 -right-24 size-96 rounded-full bg-primary/20 blur-3xl" />
          <div class="absolute bottom-0 left-1/4 size-72 rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div class="relative">
          <LogoLaris dark />
        </div>

        <div class="relative max-w-md space-y-8">
          <div class="space-y-4">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span aria-hidden="true" class="size-1.5 rounded-full bg-emerald-400" />
              Trial gratis 14 hari — tanpa kartu
            </span>
            <h1 class="text-3xl leading-tight font-extrabold tracking-tight text-white xl:text-4xl">
              POS F&amp;B yang bikin laris.{' '}
              <span class="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                Harga warung.
              </span>
            </h1>
            <p class="text-base leading-relaxed text-slate-400">
              Kasir cepat, offline tetap jalan, laporan laba-rugi yang benar-benar membantu
              keputusan usaha — mulai dari{' '}
              <span class="font-semibold text-white">{formatRupiah(starter.monthly)}</span>/bulan.
            </p>
          </div>

          <ul class="space-y-3.5">
            <CheckItem>Kasir cepat &lt;15 detik per transaksi, cetak struk Bluetooth</CheckItem>
            <CheckItem>Transaksi tetap jalan saat internet putus, sync otomatis</CheckItem>
            <CheckItem>Laporan laba, produk terlaris &amp; jam ramai tiap hari</CheckItem>
          </ul>

          <div class="grid grid-cols-2 gap-4">
            {[
              { label: starter.label, price: starter.monthly, outlets: `${starter.maxOutlets} outlet` },
              { label: tumbuh.label, price: tumbuh.monthly, outlets: `s/d ${tumbuh.maxOutlets} outlet` },
            ].map((plan) => (
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p class="text-xs font-medium text-slate-400">{plan.label}</p>
                <p class="mt-1 text-xl font-extrabold text-white">
                  {formatRupiah(plan.price)}
                  <span class="text-xs font-medium text-slate-400">/bln</span>
                </p>
                <p class="mt-0.5 text-xs text-slate-400">{plan.outlets}</p>
              </div>
            ))}
          </div>
        </div>

        <p class="relative text-xs text-slate-400">
          © {new Date().getFullYear()} LarisPOS — POS murah untuk UMKM F&amp;B Indonesia
        </p>
      </aside>

      {/* Kolom form */}
      <main class="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div class="w-full max-w-md">
          <div class="mb-8 lg:hidden">
            <LogoLaris />
          </div>
          {props.children}
        </div>
      </main>
    </div>
  )
}
