import { createMemo, createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { Motion } from '@motionone/solid'
import type { CreateProductInput } from '@larispos/shared'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Button } from '../components/ui/button'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { Card } from '../components/ui/card'
import { Modal } from '../components/ui/modal'
import { ToastProvider } from '../components/ui/toast'
import type { ToastApi } from '../components/ui/toast'
import { EmptyState, ErrorState, CardGridSkeleton } from '../components/ui/state'
import { ProductFormModal } from './ProductFormModal'
import { useAuth } from '../lib/auth-mock'
import { DEFAULT_OUTLET_ID, MOCK_OUTLETS, variantStockStatus } from '../lib/mocks'
import type { MockProduct, MockProductVariant } from '../lib/mocks'
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useResetProducts,
} from '../lib/queries'
import { formatIDR } from '../lib/format'

/* ------------------------------------------------------------------ */
/* Helpers UI                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_BADGE: Record<string, string> = {
  Makanan: 'bg-orange-500/10 text-orange-700',
  Minuman: 'bg-sky-500/10 text-sky-700',
  Snack: 'bg-violet-500/10 text-violet-700',
  Paket: 'bg-emerald-500/10 text-emerald-700',
  Umum: 'bg-slate-500/10 text-slate-700',
}

function categoryClass(category: string): string {
  return CATEGORY_BADGE[category] ?? CATEGORY_BADGE['Umum']!
}

const STOCK_STATUS_META: Record<
  string,
  { label: string; class: string; dot: string }
> = {
  aman: { label: 'Aman', class: 'bg-emerald-500/10 text-emerald-700', dot: 'bg-emerald-500' },
  menipis: { label: 'Menipis', class: 'bg-amber-500/10 text-amber-700', dot: 'bg-amber-500' },
  habis: { label: 'Habis', class: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
}

function EmptyProducts(props: {
  hasFilters: boolean
  onReset: () => void
}) {
  return (
    <EmptyState
      icon="food"
      title={props.hasFilters ? 'Tidak ada produk yang cocok' : 'Belum ada produk'}
      description={
        props.hasFilters
          ? 'Coba ubah kata kunci atau pilih kategori lain.'
          : 'Mulai dari produk pertama — lengkap dengan varian & stok.'
      }
      action={
        <Button
          variant={props.hasFilters ? 'secondary' : 'primary'}
          size="sm"
          onClick={props.onReset}
        >
          {props.hasFilters ? 'Reset filter' : 'Tambah produk'}
        </Button>
      }
    />
  )
}

/* ------------------------------------------------------------------ */
/* Halaman Produk                                                      */
/* ------------------------------------------------------------------ */

export default function ProductsPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()

  // Auth guard — sama seperti dashboard (Fase 2 mock).
  if (!isAuthenticated()) return <Navigate href="/login" />

  const toastProvider = ToastProvider()
  const toast: ToastApi = toastProvider.api

  const outlets = createMemo(() => {
    const list = [...MOCK_OUTLETS]
    const sessionOutlet = outlet()
    if (sessionOutlet && !list.some((o) => o.id === sessionOutlet.id)) {
      list.unshift({
        id: sessionOutlet.id,
        name: sessionOutlet.name,
        address: sessionOutlet.address,
      })
    }
    return list
  })

  const [outletId, setOutletId] = createSignal(outlet()?.id ?? DEFAULT_OUTLET_ID)
  const [category, setCategory] = createSignal<string>('Semua')
  const [search, setSearch] = createSignal('')

  const activeFilter = () => ({
    outletId: outletId(),
    category: category() === 'Semua' ? undefined : category(),
    search: search() || undefined,
  })

  const hasFilters = () =>
    category() !== 'Semua' || search().trim() !== ''

  const productsQuery = useProducts(activeFilter)
  const categoriesQuery = useCategories(() => outletId())
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()
  const resetMutation = useResetProducts()

  const activeOutlet = createMemo(
    () => outlets().find((o) => o.id === outletId()) ?? outlets()[0],
  )

  const totalStock = (p: MockProduct) => p.variants.reduce((s, v) => s + v.stock, 0)

  /* --- Modal state --- */
  const [formOpen, setFormOpen] = createSignal(false)
  const [editing, setEditing] = createSignal<MockProduct | null>(null)
  const [deleting, setDeleting] = createSignal<MockProduct | null>(null)
  const [confirmReset, setConfirmReset] = createSignal(false)

  const submitting = () =>
    createMutation.isPending || updateMutation.isPending

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(p: MockProduct) {
    setEditing(p)
    setFormOpen(true)
  }

  function handleFormSubmit(input: CreateProductInput) {
    const isEdit = editing() !== null
    if (isEdit) {
      updateMutation.mutate(
        { id: editing()!.id, input },
        {
          onSuccess: () => {
            setFormOpen(false)
            setEditing(null)
            toast.success('Produk diperbarui.')
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Gagal menyimpan produk.')
          },
        },
      )
    } else {
      createMutation.mutate(input, {
        onSuccess: () => {
          setFormOpen(false)
          setEditing(null)
          toast.success('Produk ditambahkan.')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Gagal menyimpan produk.')
        },
      })
    }
  }

  function handleDelete(p: MockProduct) {
    deleteMutation.mutate(p.id, {
      onSuccess: () => {
        setDeleting(null)
        toast.success(`"${p.name}" dihapus.`)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Gagal menghapus produk.')
      },
    })
  }

  function handleReset() {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmReset(false)
        toast.info('Katalog dikembalikan ke contoh awal (12 produk).')
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Gagal me-reset katalog.')
      },
    })
  }

  return (
    <SidebarLayout
      userLabel={user()?.businessName}
      outletName={activeOutlet().name}
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
              <Breadcrumb items={[{ label: 'Produk' }]} />
<h1 class="text-2xl font-extrabold tracking-tight text-foreground">Produk &amp; Varian</h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {activeOutlet().name} · {productsQuery.data?.length ?? 0} produk
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                Reset contoh
              </Button>
              <Button onClick={openCreate}>+ Tambah produk</Button>
            </div>
          </div>

          {/* Filter bar */}
          <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <label class="sr-only" for="products-outlet">Pilih outlet</label>
              <select
                id="products-outlet"
                value={outletId()}
                onChange={(e) => setOutletId(e.currentTarget.value)}
                class={[
                  'h-10 rounded-xl border bg-card px-3 text-sm font-medium text-foreground',
                  'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                  'cursor-pointer transition-colors duration-150',
                ].join(' ')}
              >
                <For each={outlets()}>
                  {(o) => <option value={o.id}>{o.name}</option>}
                </For>
              </select>

              <div
                role="group"
                aria-label="Filter kategori"
                class="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1"
              >
                <button
                  type="button"
                  onClick={() => setCategory('Semua')}
                  aria-pressed={category() === 'Semua'}
                  class={[
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                    category() === 'Semua'
                      ? 'bg-primary text-on-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  ].join(' ')}
                >
                  Semua
                </button>
                <For each={categoriesQuery.data ?? []}>
                  {(c) => (
                    <button
                      type="button"
                      onClick={() => setCategory(category() === c.name ? 'Semua' : c.name)}
                      aria-pressed={category() === c.name}
                      class={[
                        'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                        category() === c.name
                          ? 'bg-primary text-on-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      ].join(' ')}
                    >
                      {c.name}
                    </button>
                  )}
                </For>
              </div>
            </div>

            <div class="w-full lg:w-72">
              <label class="sr-only" for="products-search">Cari produk</label>
              <input
                id="products-search"
                type="search"
                placeholder="Cari nama produk / varian…"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                class={[
                  'h-10 w-full rounded-xl border bg-card px-3.5 text-sm text-foreground',
                  'placeholder:text-muted-foreground/70',
                  'border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                  'transition-colors duration-150',
                ].join(' ')}
              />
            </div>
          </div>

          {/* Grid produk */}
          <Show
            when={!productsQuery.isPending}
            fallback={<div class="mt-6"><CardGridSkeleton count={6} /></div>}
          >
            <Show
              when={!productsQuery.isError}
              fallback={
                <div class="mt-6">
                  <ErrorState
                    title="Gagal memuat produk"
                    message={productsQuery.error?.message ?? 'Terjadi kesalahan tak terduga.'}
                    onRetry={() => productsQuery.refetch()}
                  />
                </div>
              }
            >
              <Show
                when={(productsQuery.data?.length ?? 0) > 0}
                fallback={
                  <div class="mt-6">
                    <EmptyProducts
                      hasFilters={hasFilters()}
                      onReset={() => (hasFilters() ? (setCategory('Semua'), setSearch('')) : openCreate())}
                    />
                  </div>
                }
              >
                <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <For each={productsQuery.data!}>
                    {(p, i) => (
                      <Motion tag="li"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: (i() * 40) / 1000, easing: 'ease-out' }}
                      >
                        <Card class="flex h-full flex-col">
                          <div class="flex flex-1 flex-col p-5">
                            <div class="flex items-start justify-between gap-2">
                              <h2 class="min-w-0 truncate text-base font-bold text-foreground">
                                {p.name}
                              </h2>
                              <span
                                class={[
                                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                  categoryClass(p.category),
                                ].join(' ')}
                              >
                                {p.category}
                              </span>
                            </div>

                            <p class="mt-1.5 text-xs text-muted-foreground">
                              HPP {formatIDR(p.costPrice)} · {totalStock(p)} unit total
                            </p>

                            <ul class="mt-4 space-y-1.5">
                              <For each={p.variants}>
                                {(v: MockProductVariant) => {
                                  const status = variantStockStatus(v)
                                  const meta = STOCK_STATUS_META[status]!
                                  return (
                                    <li class="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                                      <span class="min-w-0 truncate text-sm font-semibold text-foreground">
                                        {v.name}
                                        <span class="ml-1.5 text-xs font-normal text-muted-foreground">
                                          {formatIDR(v.sellPrice)}
                                        </span>
                                      </span>
                                      <span class="flex shrink-0 items-center gap-1.5">
                                        <span class="text-xs font-medium text-muted-foreground tabular-nums">
                                          {v.stock}
                                        </span>
                                        <span
                                          class={[
                                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                            meta.class,
                                          ].join(' ')}
                                        >
                                          <span aria-hidden="true" class={`size-1.5 rounded-full ${meta.dot}`} />
                                          {meta.label}
                                        </span>
                                      </span>
                                    </li>
                                  )
                                }}
                              </For>
                            </ul>
                          </div>

                          <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleting(p)}>
                              Hapus
                            </Button>
                          </div>
                        </Card>
                      </Motion>
                    )}
                  </For>
                </ul>
              </Show>
            </Show>
          </Show>
        </Motion>
      </main>

      {/* Modal create/edit */}
      <Modal
        open={formOpen()}
        onClose={() => {
          if (!submitting()) {
            setFormOpen(false)
            setEditing(null)
          }
        }}
        title={editing() ? 'Edit produk' : 'Tambah produk'}
        description={editing() ? `Perbarui detail ${editing()!.name}` : 'Lengkapi detail produk & variannya'}
        size="lg"
      >
        <ProductFormModal
          open={formOpen()}
          product={editing()}
          outletId={outletId()}
          submitting={submitting()}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      </Modal>

      {/* Konfirmasi hapus */}
      <Modal
        open={deleting() !== null}
        onClose={() => setDeleting(null)}
        title="Hapus produk?"
        description={
          deleting()
            ? `"${deleting()!.name}" beserta ${deleting()!.variants.length} variannya akan dihapus permanen.`
            : undefined
        }
        size="sm"
        hideClose
      >
        <div class="flex flex-col gap-4">
          <p class="text-sm leading-relaxed text-muted-foreground">
            Tindakan ini tidak bisa dibatalkan. Stok varian produk ini juga ikut terhapus.
          </p>
          <div class="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteMutation.isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleting() && handleDelete(deleting()!)}
            >
              {deleteMutation.isPending ? 'Menghapus…' : 'Ya, hapus'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Konfirmasi reset katalog */}
      <Modal
        open={confirmReset()}
        onClose={() => setConfirmReset(false)}
        title="Reset katalog contoh?"
        description="Semua perubahan produk akan diganti dengan contoh awal (12 produk per outlet)."
        size="sm"
        hideClose
      >
        <div class="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmReset(false)} disabled={resetMutation.isPending}>
            Batal
          </Button>
          <Button variant="destructive" loading={resetMutation.isPending} onClick={handleReset}>
            {resetMutation.isPending ? 'Me-reset…' : 'Reset'}
          </Button>
        </div>
      </Modal>
    </SidebarLayout>
  )
}
