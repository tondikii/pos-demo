import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import { GRACE_DAYS, PLAN_DETAILS, PLAN_ORDER, PLANS, TRIAL_DAYS } from '@larispos/shared'
import type { PlanId } from '@larispos/shared'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Button } from '../components/ui/button'
import { Icon } from '../components/ui/icon'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Modal } from '../components/ui/modal'
import { ToastProvider } from '../components/ui/toast'
import type { ToastApi } from '../components/ui/toast'
import { EmptyState, ErrorState, StatSkeletonCard } from '../components/ui/state'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { useAuth } from '../lib/auth-mock'
import {
  billingCycleLabel,
  type MockBillingCycle,
  type MockSubscription,
  type MockSubscriptionHistoryEntry,
} from '../lib/subscription-mocks'
import {
  useSubscription,
  useUpgradeSubscription,
} from '../lib/queries'
import { formatIDR, formatCompact } from '../lib/format'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Label billing untuk tombol & riwayat. */
function priceLabel(plan: (typeof PLANS)[PlanId], cycle: MockBillingCycle): string {
  if (cycle === 'yearly' && plan.yearly !== null) return formatIDR(plan.yearly)
  return formatIDR(plan.monthly)
}

function amountForPlan(plan: PlanId, cycle: MockBillingCycle): number {
  const p = PLANS[plan]
  if (cycle === 'yearly') return p.yearly ?? p.monthly * 12
  return p.monthly
}

const STATUS_LABEL: Record<MockSubscription['status'], string> = {
  trialing: 'Trial',
  active: 'Aktif',
  past_due: 'Tunggakan',
  dormant: 'Tidak aktif (grace)',
  frozen: 'Dibekukan',
}

const STATUS_BADGE: Record<
  MockSubscription['status'],
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  trialing: 'default',
  active: 'success',
  past_due: 'warning',
  dormant: 'warning',
  frozen: 'danger',
}

const HISTORY_TYPE_LABEL: Record<MockSubscriptionHistoryEntry['type'], string> = {
  checkout: 'Checkout',
  upgrade: 'Upgrade paket',
  trial: 'Mulai trial',
  invoice: 'Tagihan',
}

/** Warna label riwayat per tipe. */
function historyTypeClass(type: MockSubscriptionHistoryEntry['type']): string {
  if (type === 'upgrade') return 'text-emerald-700'
  if (type === 'invoice') return 'text-foreground'
  if (type === 'checkout') return 'text-muted-foreground'
  return 'text-muted-foreground'
}

/* ------------------------------------------------------------------ */
/* Skeleton & state helpers                                            */
/* ------------------------------------------------------------------ */

function SubscriptionSkeleton() {
  return (
    <div aria-busy="true" class="mt-6 space-y-6">
      <StatSkeletonCard class="p-6" />
      <div class="grid gap-4 lg:grid-cols-3">
        <For each={[0, 1, 2]}>
          {() => (
            <div class="animate-pulse rounded-2xl border border-border bg-card p-6">
              <div class="h-4 w-20 rounded bg-muted" />
              <div class="mt-4 h-8 w-28 rounded bg-muted" />
              <div class="mt-4 space-y-2">
                <For each={[0, 1, 2, 3]}>
                  {() => <div class="h-3 w-full rounded bg-muted" />}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function SubscriptionErrorState(props: { message: string; onRetry: () => void }) {
  return (
    <ErrorState
      title="Gagal memuat status langganan"
      message={props.message}
      onRetry={props.onRetry}
      class="mt-6"
    />
  )
}

/* ------------------------------------------------------------------ */
/* Status saat ini (trial banner / status aktif)                       */
/* ------------------------------------------------------------------ */

function TrialStatusCard(props: { sub: MockSubscription }) {
  const daysLeft = () => Math.max(0, props.sub.trialDaysLeft)
  const pct = () => (TRIAL_DAYS > 0 ? Math.min(100, Math.max(2, (daysLeft() / TRIAL_DAYS) * 100)) : 0)

  return (
    <Card class="p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-foreground">Masa trial</p>
            <Badge variant="default">Trial</Badge>
          </div>
          <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
            {daysLeft()} <span class="text-base font-bold text-muted-foreground">hari tersisa</span>
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            {props.sub.planLabel} · berakhir {props.sub.trialEndsAt ?? '—'}
          </p>
        </div>
        <Badge variant="outline">{props.sub.maxOutlets} outlet aktif</Badge>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TRIAL_DAYS}
        aria-valuenow={daysLeft()}
        aria-label="Sisa masa trial"
        class="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <Motion tag="div"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, easing: 'ease-out' }}
          class={[
            'h-full origin-left rounded-full',
            daysLeft() <= 3 ? 'bg-amber-500' : 'bg-primary',
          ].join(' ')}
          style={{ width: `${pct()}%` }}
        >
          <span class="sr-only">{daysLeft()} dari {TRIAL_DAYS} hari</span>
        </Motion>
      </div>
      <p class="mt-2 text-xs text-muted-foreground">
        {daysLeft() <= 3
          ? 'Trial hampir habis — pilih paket agar layanan tidak terganggu.'
          : `Gunakan semua fitur secara gratis selama ${TRIAL_DAYS} hari.`}
      </p>
    </Card>
  )
}

function ActiveStatusCard(props: { sub: MockSubscription }) {
  return (
    <Card class="p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-foreground">Paket aktif</p>
            <Badge variant={STATUS_BADGE[props.sub.status]}>{STATUS_LABEL[props.sub.status]}</Badge>
          </div>
          <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
            {props.sub.planLabel}
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            {props.sub.status === 'active'
              ? `Periode berakhir ${props.sub.currentPeriodEnd ?? '—'}`
              : 'Status langganan Anda memerlukan perhatian.'}
          </p>
        </div>
        <Badge variant="outline">{props.sub.maxOutlets} outlet aktif</Badge>
      </div>

      <div class="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <Icon name="check" class="size-4 text-emerald-500" /> Semua fitur aktif — transaksi, laporan, dan outlet dalam batas paket Anda.
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Kartu paket                                                         */
/* ------------------------------------------------------------------ */

/** Urutan kartu, highlight & fitur paket — SINGLE SOURCE dari packages/shared
 *  (sinkron dengan landing page). */
const PLAN_HIGHLIGHT: Record<PlanId, boolean> = Object.fromEntries(
  PLAN_ORDER.map((p) => [p, PLAN_DETAILS[p].highlighted]),
) as Record<PlanId, boolean>

const PLAN_FEATURES: Record<PlanId, readonly string[]> = Object.fromEntries(
  PLAN_ORDER.map((p) => [p, PLAN_DETAILS[p].features]),
) as Record<PlanId, readonly string[]>

function PlanCard(props: {
  plan: PlanId
  selected: boolean
  /** Label badge kartu terpilih ("Terpilih" saat trial, "Paket Anda" saat aktif). */
  selectedLabel: string
  cycle: MockBillingCycle
  onSelect: (plan: PlanId, cycle: MockBillingCycle) => void
  index: number
}) {
  const def = PLANS[props.plan]
  const highlight = () => PLAN_HIGHLIGHT[props.plan]

  return (
    <Motion tag="div"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: props.index * 0.08, easing: 'ease-out' }}
      class="h-full"
    >
      <div
        class={[
          'relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-200',
          props.selected
            ? 'border-primary bg-card shadow-lg ring-2 ring-primary/30'
            : 'border-border bg-card shadow-sm hover:shadow-md',
        ].join(' ')}
      >
        {/* Highlight "Paling laris" */}
        <Show when={highlight()}>
          <span class="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-on-accent">
            Paling laris
          </span>
        </Show>

        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-extrabold text-foreground">{def.label}</h3>
          <Show when={props.selected}>
            <Badge variant="primary">{props.selectedLabel}</Badge>
          </Show>
        </div>

        {/* Harga */}
        <div class="mt-4">
          <p class="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
            {priceLabel(def, props.cycle)}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {props.cycle === 'yearly'
              ? '/tahun · hemat 17%'
              : '/bulan · tagihan bulanan'}
          </p>
          <Show when={props.cycle === 'yearly'}>
            <Show
              when={def.yearly !== null}
              fallback={<p class="mt-1 text-xs font-semibold text-muted-foreground">Harga custom per outlet</p>}
            >
              <p class="mt-1 text-xs font-semibold text-emerald-700">
                Hemat {formatCompact(def.monthly * 12 - (def.yearly ?? def.monthly * 12))}/tahun
              </p>
            </Show>
          </Show>
        </div>

        {/* Fitur */}
        <ul class="mt-5 flex-1 space-y-2">
          <For each={PLAN_FEATURES[props.plan]}>
            {(feature) => (
              <li class="flex items-start gap-2 text-sm text-muted-foreground">
                <span aria-hidden="true" class="mt-0.5">
                <Icon name="check" class="size-4 text-emerald-500" />
              </span>
                {feature}
              </li>
            )}
          </For>
        </ul>

        <Button
          class="mt-6 w-full"
          variant={props.selected ? 'secondary' : 'primary'}
          fullWidth
          onClick={() => props.onSelect(props.plan, props.cycle)}
        >
          {props.selected ? 'Kelola paket' : 'Pilih paket'}
        </Button>
      </div>
    </Motion>
  )
}

/* ------------------------------------------------------------------ */
/* Modal konfirmasi upgrade                                            */
/* ------------------------------------------------------------------ */

function UpgradeModal(props: {
  open: boolean
  plan: PlanId
  cycle: MockBillingCycle
  onConfirm: () => void
  onClose: () => void
}) {
  const def = () => PLANS[props.plan]
  const amount = () => amountForPlan(props.plan, props.cycle)

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Konfirmasi upgrade paket"
      description={`${def().label} — tagihan ${billingCycleLabel(props.cycle)}`}
      size="md"
    >
      <div class="space-y-4">
        <dl class="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <div class="flex items-center justify-between gap-4">
            <dt class="text-muted-foreground">Paket</dt>
            <dd class="font-bold text-foreground">{def().label}</dd>
          </div>
          <div class="mt-2 flex items-center justify-between gap-4">
            <dt class="text-muted-foreground">Billing</dt>
            <dd class="font-semibold text-foreground">{billingCycleLabel(props.cycle)}</dd>
          </div>
          <div class="mt-2 flex items-center justify-between gap-4">
            <dt class="text-muted-foreground">Batas outlet</dt>
            <dd class="font-semibold text-foreground">
              {props.plan === 'jaringan' ? '4+ outlet' : `${def().maxOutlets} outlet`}
            </dd>
          </div>
          <div class="mt-3 border-t border-border pt-2.5">
            <div class="flex items-center justify-between gap-4">
              <dt class="font-medium text-foreground">Total</dt>
              <dd class="text-lg font-extrabold text-foreground tabular-nums">
                {formatIDR(amount())}
              </dd>
            </div>
          </div>
        </dl>

        <Show when={props.cycle === 'yearly'}>
          <p class="flex items-center gap-1.5 text-xs text-emerald-700">
            <Icon name="check" class="size-3.5 text-emerald-600" /> Billing tahunan menghemat 17% dibanding bulanan.
          </p>
        </Show>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={props.onClose}>
            Batal
          </Button>
          <Button onClick={props.onConfirm}>Konfirmasi upgrade</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Riwayat langganan                                                   */
/* ------------------------------------------------------------------ */

function HistoryList(props: { entries: MockSubscriptionHistoryEntry[] }) {
  /** Format ISO → "YYYY-MM-DD · HH:MM" (waktu lokal). */
  const localDateTime = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const date = d.toLocaleDateString('id-ID')
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return `${date} · ${time}`
  }

  return (
    <Card hover={false}>
      <div class="p-5 pb-3">
        <h2 class="text-base font-bold text-foreground">Riwayat langganan</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Tagihan, upgrade, dan aktivasi trial
        </p>
      </div>
      <Show
        when={props.entries.length > 0}
        fallback={
          <EmptyState
            compact
            icon="receipt"
            title="Belum ada riwayat langganan"
            description="Tagihan, upgrade, dan aktivasi trial akan muncul di sini."
          />
        }
      >
        <ul class="divide-y divide-border">
          <For each={props.entries}>
            {(entry, i) => (
              <Motion tag="li"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i() * 0.03, easing: 'ease-out' }}
                class="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-foreground">
                    {HISTORY_TYPE_LABEL[entry.type]}
                    <span class={['ml-2 text-xs font-medium', historyTypeClass(entry.type)].join(' ')}>
                      {entry.planLabel}
                    </span>
                  </p>
                  <p class="mt-0.5 text-xs text-muted-foreground">{localDateTime(entry.date)}</p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-sm font-bold text-foreground tabular-nums">
                    {entry.amount > 0 ? formatIDR(entry.amount) : 'Gratis'}
                  </p>
                  <Badge variant={STATUS_BADGE[entry.status]} class="mt-1">
                    {STATUS_LABEL[entry.status]}
                  </Badge>
                </div>
              </Motion>
            )}
          </For>
        </ul>
      </Show>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Halaman Langganan                                                   */
/* ------------------------------------------------------------------ */

export default function SubscriptionPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()

  // Auth guard — sama seperti halaman app lain (Fase 2 mock).
  if (!isAuthenticated()) return <Navigate href="/login" />

  const toastProvider = ToastProvider()
  const toast: ToastApi = toastProvider.api

  const sub = useSubscription()
  const upgrade = useUpgradeSubscription()

  const [cycle, setCycle] = createSignal<MockBillingCycle>('monthly')
  const [pendingPlan, setPendingPlan] = createSignal<PlanId | null>(null)
  const [confirmOpen, setConfirmOpen] = createSignal(false)

  const currentPlan = createMemo(() => sub.data?.plan ?? 'starter')

  const isTrialing = createMemo(() => sub.data?.status === 'trialing')

  const selectedPlan = createMemo<PlanId | null>(() => {
    const pending = pendingPlan()
    if (pending) return pending
    return isTrialing() ? null : currentPlan()
  })

  const planIsSelected = (plan: PlanId) => selectedPlan() === plan

  /** Klik "Pilih paket" — kartu terpilih + scroll ke tombol konfirmasi. */
  const handleSelectPlan = (plan: PlanId) => {
    setPendingPlan(plan)
    const el = document.getElementById('plan-actions')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const openUpgradeModal = () => {
    if (!pendingPlan()) {
      toast.info('Pilih paket terlebih dahulu.')
      return
    }
    setConfirmOpen(true)
  }

  const confirmUpgrade = async () => {
    const plan = pendingPlan()
    if (!plan) return
    try {
      await upgrade.mutateAsync({ plan, billingCycle: cycle() })
      toast.success(`${PLANS[plan].label} aktif — tagihan ${billingCycleLabel(cycle())}.`)
      setConfirmOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upgrade gagal, coba lagi.')
    }
  }


  return (
    <SidebarLayout
      userLabel={user()?.businessName}
      outletName={outlet()?.name}
      onLogout={() => logout()}
    >
      {toastProvider.view}

      <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Motion tag="div"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, easing: 'ease-out' }}
        >
          {/* Judul + aksi */}
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Breadcrumb items={[{ label: 'Pengaturan', href: '/outlets' }, { label: 'Langganan' }]} />
<h1 class="text-2xl font-extrabold tracking-tight text-foreground">Langganan</h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {user()?.businessName ?? 'Usaha Anda'} · {outlet()?.name ?? ''}
              </p>
            </div>
          </div>

          <Show when={!sub.isPending} fallback={<SubscriptionSkeleton />}>
            <Show
              when={!sub.isError}
              fallback={
                <SubscriptionErrorState
                  message={sub.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                  onRetry={() => sub.refetch()}
                />
              }
            >
              <Show when={sub.data}>
                {(data) => (
                  <>
                    {/* Status saat ini */}
                    <div class="mt-6">
                      <Show
                        when={isTrialing()}
                        fallback={<ActiveStatusCard sub={data()} />}
                      >
                        <TrialStatusCard sub={data()} />
                      </Show>
                    </div>

                    {/* Toggle billing cycle */}
                    <section aria-label="Pilih paket" class="mt-10">
                      <div class="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 class="text-lg font-extrabold tracking-tight text-foreground">
                            Pilih paket
                          </h2>
                          <p class="mt-1 text-sm text-muted-foreground">
                            Upgrade kapan saja — perbedaan prorata dihitung otomatis.
                          </p>
                        </div>
                        <div
                          role="group"
                          aria-label="Siklus tagihan"
                          class="flex items-center gap-1 rounded-xl border border-border bg-card p-1"
                        >
                          <button
                            type="button"
                            onClick={() => setCycle('monthly')}
                            aria-pressed={cycle() === 'monthly'}
                            class={[
                              'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                              cycle() === 'monthly'
                                ? 'bg-primary text-on-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            ].join(' ')}
                          >
                            Bulanan
                          </button>
                          <button
                            type="button"
                            onClick={() => setCycle('yearly')}
                            aria-pressed={cycle() === 'yearly'}
                            class={[
                              'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                              cycle() === 'yearly'
                                ? 'bg-primary text-on-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            ].join(' ')}
                          >
                            Tahunan · hemat 17%
                          </button>
                        </div>
                      </div>

                      {/* 3 kartu paket — entrance stagger */}
                      <div class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <For each={PLAN_ORDER}>
                          {(plan, i) => (
                            <PlanCard
                              plan={plan}
                              selected={planIsSelected(plan)}
                              selectedLabel={isTrialing() ? 'Terpilih' : 'Paket Anda'}
                              cycle={cycle()}
                              onSelect={handleSelectPlan}
                              index={i()}
                            />
                          )}
                        </For>
                      </div>

                      {/* Panel aksi paket terpilih */}
                      <Show when={selectedPlan()}>
                        {(sel) => (
                          <Motion tag="div"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, easing: 'ease-out' }}
                            id="plan-actions"
                            class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5"
                          >
                            <div>
                              <p class="text-sm font-bold text-foreground">
                                {PLANS[sel()].label} — {billingCycleLabel(cycle())}
                              </p>
                              <p class="mt-0.5 text-sm text-muted-foreground">
                                {priceLabel(PLANS[sel()], cycle())}
                                {cycle() === 'yearly' ? ' /tahun' : ' /bulan'}
                                {!isTrialing() && sel() === currentPlan()
                                  ? ' · paket aktif saat ini'
                                  : ''}
                              </p>
                            </div>
                            <Button onClick={() => openUpgradeModal()}>
                              {isTrialing()
                                ? 'Konfirmasi & mulai berlangganan'
                                : sel() === currentPlan()
                                  ? 'Paket aktif — kelola tagihan'
                                  : 'Upgrade ke paket ini'}
                            </Button>
                          </Motion>
                        )}
                      </Show>
                    </section>

                    {/* Catatan grace period */}
                    <section
                      aria-label="Catatan masa tenggang"
                      class="mt-6 rounded-2xl border border-amber-500/30 bg-amber-50 p-5"
                    >
                      <div class="flex items-start gap-3">
                        <span aria-hidden="true" class="mt-0.5 shrink-0">
                        <Icon name="shield" class="size-5 text-amber-600" />
                      </span>
                        <div>
                          <p class="text-sm font-bold text-amber-700">Masa tenggang 7 hari</p>
                          <p class="mt-1 text-sm text-amber-800/90">
                            Jika tagihan tidak terbayar, status berubah{' '}
                            <span class="font-semibold">past_due</span> → setelah{' '}
                            {GRACE_DAYS} hari menjadi <span class="font-semibold">dormant</span>{' '}
                            (laporan tetap bisa dibaca) → setelah {GRACE_DAYS} hari berikutnya
                            menjadi <span class="font-semibold">frozen</span> (kasir & transaksi
                            dihentikan). Data outlet tetap aman saat downgrade.
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* Riwayat */}
                    <div class="mt-6">
                      <HistoryList entries={data().history} />
                    </div>
                  </>
                )}
              </Show>
            </Show>
          </Show>
        </Motion>
      </main>

      {/* Modal konfirmasi upgrade */}
      <Show when={pendingPlan()}>
        {(plan) => (
          <UpgradeModal
            open={confirmOpen()}
            plan={plan()}
            cycle={cycle()}
            onConfirm={() => void confirmUpgrade()}
            onClose={() => setConfirmOpen(false)}
          />
        )}
      </Show>
    </SidebarLayout>
  )
}
