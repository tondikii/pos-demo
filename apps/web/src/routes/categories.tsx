import { createSignal, For, Show } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { categorySchema } from '@larispos/shared'
import { SidebarLayout } from '../components/app/SidebarLayout'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'
import { Icon } from '../components/ui/icon'
import { useAuth } from '../lib/auth-mock'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../lib/queries'
import { parseWithZod } from '../lib/validation'

/**
 * Kategori produk (adjustable) — PRD: owner bisa tambah/edit/hapus kategori.
 * Dipakai filter & form produk. Data mock per outlet (localStorage).
 */
export default function CategoriesPage() {
  const { user, outlet, isAuthenticated, logout } = useAuth()
  const [newName, setNewName] = createSignal('')
  const [newError, setNewError] = createSignal<string | null>(null)
  const [editing, setEditing] = createSignal<{ id: string; name: string } | null>(null)

  const categories = useCategories(() => outlet()?.id ?? null)
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()

  if (!isAuthenticated()) return <Navigate href="/login" />

  const outletId = () => outlet()?.id ?? ''

  function handleAdd() {
    const res = parseWithZod(categorySchema, { name: newName() })
    if (!res.ok) {
      setNewError(res.errors?.name ?? 'Nama kategori tidak valid.')
      return
    }
    setNewError(null)
    void createCat.mutateAsync({ name: res.data.name, outletId: outletId() }).catch((e) => {
      setNewError(e instanceof Error ? e.message : 'Gagal menambah kategori.')
    })
    setNewName('')
  }

  function handleRename() {
    const e = editing()
    if (!e) return
    const res = parseWithZod(categorySchema, { name: e.name })
    if (!res.ok) return
    void updateCat.mutateAsync({ id: e.id, name: res.data.name })
    setEditing(null)
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Hapus kategori "${name}"? Produk di kategori ini tetap tersimpan (kategori menjadi "Umum").`)) return
    void deleteCat.mutateAsync(id)
  }

  return (
    <SidebarLayout userLabel={user()?.businessName} outletName={outlet()?.name} onLogout={logout}>
      <main class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Kategori' }]} />
        <h1 class="text-2xl font-extrabold tracking-tight text-foreground">Kategori Produk</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Kelola kategori untuk memudahkan kasir mencari produk. Kategori bisa ditambah, diganti nama, atau dihapus.
        </p>

        <Card class="mt-6">
          <div class="p-5">
            <p class="text-sm font-semibold text-foreground">Tambah kategori</p>
            <form
              class="mt-3 flex items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                handleAdd()
              }}
            >
              <div class="flex-1">
                <Field label="Nama kategori" for="cat-new" errorMessage={newError() ?? undefined}>
                  <Input
                    id="cat-new"
                    placeholder="mis. Kopi, Topping, Camilan"
                    value={newName()}
                    onInput={(e) => setNewName(e.currentTarget.value)}
                    invalid={Boolean(newError())}
                  />
                </Field>
              </div>
              <Button type="submit" class="mt-6" disabled={createCat.isPending}>
                Tambah
              </Button>
            </form>
          </div>
        </Card>

        <Card class="mt-4">
          <div class="p-5">
            <p class="text-sm font-semibold text-foreground">Daftar kategori</p>
            <Show
              when={!categories.isPending}
              fallback={<p class="mt-3 text-sm text-muted-foreground">Memuat kategori…</p>}
            >
              <ul class="mt-3 divide-y divide-border">
                <For each={categories.data ?? []}>
                  {(cat) => {
                    return (
                      <li class="flex items-center justify-between gap-3 py-2.5">
                        <Show
                          when={editing()?.id === cat.id}
                          fallback={
                            <span class="text-sm font-medium text-foreground">{cat.name}</span>
                          }
                        >
                          <Input
                            value={editing()?.name ?? cat.name}
                            onInput={(e) => setEditing((ed) => (ed ? { ...ed, name: e.currentTarget.value } : ed))}
                            class="max-w-56"
                          />
                        </Show>
                        <div class="flex items-center gap-1.5">
                          {editing()?.id === cat.id ? (
                            <>
                              <Button size="sm" onClick={handleRename} disabled={updateCat.isPending}>
                                Simpan
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                                Batal
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditing({ id: cat.id, name: cat.name })}
                              >
                                <Icon name="edit" class="size-3.5" />
                                <span class="ml-1">Ubah</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                class="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(cat.id, cat.name)}
                              >
                                <Icon name="trash" class="size-3.5" />
                                <span class="ml-1">Hapus</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    )
                  }}
                </For>
              </ul>
            </Show>
          </div>
        </Card>
      </main>
    </SidebarLayout>
  )
}

