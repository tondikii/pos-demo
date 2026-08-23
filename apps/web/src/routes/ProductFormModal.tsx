import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { DEFAULT_LOW_STOCK_THRESHOLD, createProductSchema } from '@larispos/shared'
import type { CreateProductInput } from '@larispos/shared'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { CurrencyInput } from '../components/ui/currency-input'
import { Field } from '../components/ui/field'
import { useCategories } from '../lib/queries'
import { parseWithZod, type FieldErrors } from '../lib/validation'
import type { MockProduct } from '../lib/mocks'

/* ------------------------------------------------------------------ */
/* Form state (string-based, mirip onboarding) + validasi Zod shared   */
/* ------------------------------------------------------------------ */

interface VariantFormRow {
  name: string
  sellPrice: string
  stock: string
  lowStockThreshold: string
}

export interface ProductFormValues {
  name: string
  category: string
  costPrice: string
  imageUrl: string
  variants: VariantFormRow[]
}

const EMPTY_ROW: VariantFormRow = {
  name: '',
  sellPrice: '',
  stock: '0',
  lowStockThreshold: String(DEFAULT_LOW_STOCK_THRESHOLD),
}

function cloneRow(): VariantFormRow {
  return { ...EMPTY_ROW }
}

function toVariantInput(row: VariantFormRow) {
  return {
    name: row.name.trim(),
    sellPrice: row.sellPrice === '' ? 0 : Number(row.sellPrice),
    stock: row.stock === '' ? 0 : Number(row.stock),
    lowStockThreshold:
      row.lowStockThreshold === '' ? DEFAULT_LOW_STOCK_THRESHOLD : Number(row.lowStockThreshold),
  }
}

function toInput(values: ProductFormValues, outletId: string): CreateProductInput {
  const imageUrl = values.imageUrl.trim()
  return {
    outletId,
    name: values.name.trim(),
    category: values.category || 'Umum',
    costPrice: values.costPrice === '' ? 0 : Number(values.costPrice),
    imageUrl: imageUrl || undefined,
    variants: values.variants.map(toVariantInput),
  }
}

export function formValuesFromProduct(p: MockProduct): ProductFormValues {
  return {
    name: p.name,
    category: p.category,
    costPrice: String(p.costPrice),
    imageUrl: p.imageUrl ?? '',
    variants: p.variants.map((v) => ({
      name: v.name,
      sellPrice: String(v.sellPrice),
      stock: String(v.stock),
      lowStockThreshold: String(v.lowStockThreshold),
    })),
  }
}

export function emptyFormValues(): ProductFormValues {
  return { name: '', category: 'Makanan', costPrice: '', imageUrl: '', variants: [cloneRow()] }
}

/* ------------------------------------------------------------------ */
/* ProductFormModal                                                    */
/* ------------------------------------------------------------------ */

export interface ProductFormModalProps {
  open: boolean
  /** Produk yang diedit — null = mode create. */
  product: MockProduct | null
  outletId: string
  submitting: boolean
  onClose: () => void
  onSubmit: (input: CreateProductInput) => void
}

const FIELD_ERROR_KEYS = ['name', 'costPrice', 'imageUrl'] as const

export function ProductFormModal(props: ProductFormModalProps) {
  const [values, setValues] = createSignal<ProductFormValues>(emptyFormValues())
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})

  // Kategori dari state adjustable (bukan constant) — fallback ke default.
  const categoriesQuery = useCategories(() => props.outletId)
  const categoryOptions = createMemo(() => {
    const names = (categoriesQuery.data ?? []).map((c) => c.name)
    const current = values().category
    return current && !names.includes(current) ? [...names, current] : names
  })

  // Reset form setiap kali modal dibuka (create ataupun edit).
  createEffect(() => {
    if (props.open) {
      setValues(props.product ? formValuesFromProduct(props.product) : emptyFormValues())
      setErrors({})
      setTouched({})
    }
  })

  const isEdit = () => props.product !== null

  const fieldErrors = createMemo(() => {
    const errs = errors()
    const t = touched()
    const out: FieldErrors = {}
    for (const key of FIELD_ERROR_KEYS) {
      if (t[key] && errs[key]) out[key] = errs[key]
    }
    return out
  })

  /** Error per baris varian, key `variants.{i}.{field}`. */
  const variantErrors = createMemo(() => {
    const errs = errors()
    const out: Record<number, FieldErrors> = {}
    for (const [path, message] of Object.entries(errs)) {
      const m = /^variants\.(\d+)\.(\w+)$/.exec(path)
      if (m) {
        const idx = Number(m[1])
        out[idx] = { ...(out[idx] ?? {}), [m[2]]: message }
      }
    }
    return out
  })

  function setProductField(key: 'name' | 'category' | 'costPrice' | 'imageUrl', value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    if (touched()[key]) {
      const res = parseWithZod(createProductSchema, toInput({ ...values(), [key]: value }, props.outletId))
      if (res.ok) {
        setErrors((e) => {
          const next = { ...e }
          for (const k of Object.keys(next)) {
            if (k === key || k.startsWith('variants.')) delete next[k]
          }
          return next
        })
      } else {
        setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
      }
    }
  }

  function setVariantField(idx: number, key: keyof VariantFormRow, value: string) {
    const nextValues: ProductFormValues = {
      ...values(),
      variants: values().variants.map((row, i) => (i === idx ? { ...row, [key]: value } : row)),
    }
    setValues(nextValues)
    // Validasi penuh — error varian muncul live (field tersentuh saat submit).
    const res = parseWithZod(createProductSchema, toInput(nextValues, props.outletId))
    if (res.ok) {
      setErrors((e) => {
        const next = { ...e }
        for (const k of Object.keys(next)) {
          if (k === `variants.${idx}` || k.startsWith(`variants.${idx}.`)) delete next[k]
        }
        return next
      })
    } else {
      setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
    }
  }

  function addVariant() {
    setValues((v) => ({ ...v, variants: [...v.variants, cloneRow()] }))
  }

  function removeVariant(idx: number) {
    setValues((v) => ({ ...v, variants: v.variants.filter((_, i) => i !== idx) }))
    setErrors((e) => {
      const next = { ...e }
      for (const k of Object.keys(next)) {
        if (k.startsWith(`variants.${idx}.`)) delete next[k]
      }
      return next
    })
  }

  function handleBlur(key: string) {
    setTouched((t) => ({ ...t, [key]: true }))
    const res = parseWithZod(createProductSchema, toInput(values(), props.outletId))
    if (!res.ok) setErrors((e) => ({ ...e, ...(res.errors ?? {}) }))
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const res = parseWithZod<typeof createProductSchema>(createProductSchema, toInput(values(), props.outletId))
    if (!res.ok) {
      setErrors(res.errors ?? {})
      setTouched({ name: true, costPrice: true })
      return
    }
    props.onSubmit(res.data)
  }

  return (
    <Show when={props.open}>
      <form onSubmit={handleSubmit} noValidate>
        <div class="space-y-4">
          <Field label="Nama produk" for="pf-name" required errorMessage={fieldErrors().name}>
            <Input
              id="pf-name"
              name="name"
              placeholder="mis. Kopi Susu Gula Aren"
              value={values().name}
              invalid={Boolean(fieldErrors().name)}
              onInput={(e) => setProductField('name', e.currentTarget.value)}
              onBlur={() => handleBlur('name')}
            />
          </Field>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kategori" for="pf-category" required>
              <select
                id="pf-category"
                name="category"
                value={values().category}
                onChange={(e) => setProductField('category', e.currentTarget.value)}
                class={[
                  'h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3.5 text-sm text-foreground',
                  'transition-colors duration-150 hover:border-primary/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                ].join(' ')}
              >
                <For each={categoryOptions()}>
                  {(c) => <option value={c}>{c}</option>}
                </For>
              </select>
            </Field>
            <Field
              label="HPP (harga pokok)"
              for="pf-cost"
              errorMessage={fieldErrors().costPrice}
              hint="Boleh 0"
            >
              <CurrencyInput
                id="pf-cost"
                name="costPrice"
                placeholder="0"
                value={values().costPrice === '' ? 0 : Number(values().costPrice)}
                invalid={Boolean(fieldErrors().costPrice)}
                onValue={(n) => setProductField('costPrice', n === 0 ? '' : String(n))}
                onBlur={() => handleBlur('costPrice')}
              />
            </Field>
          </div>

          {/* Foto produk — URL opsional; kosong → placeholder makanan default */}
          <div class="flex items-start gap-4">
            <img
              src={values().imageUrl || undefined}
              alt="Pratinjau foto produk"
              class="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
              onLoad={(e) => (e.currentTarget.style.display = '')}
            />
            <div class="flex-1">
              <Field
                label="Foto produk (URL)"
                for="pf-image"
                errorMessage={fieldErrors().imageUrl}
                hint="Kosongkan untuk memakai placeholder makanan otomatis."
              >
                <Input
                  id="pf-image"
                  name="imageUrl"
                  inputmode="url"
                  placeholder="https://… (opsional)"
                  value={values().imageUrl}
                  invalid={Boolean(fieldErrors().imageUrl)}
                  onInput={(e) => setProductField('imageUrl', e.currentTarget.value)}
                  onBlur={() => handleBlur('imageUrl')}
                />
              </Field>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-foreground">
                Varian <span class="text-destructive">*</span>
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={addVariant}>
                + Tambah varian
              </Button>
            </div>
            <p class="mt-0.5 text-xs text-muted-foreground">
              Minimal 1 varian — nama, harga jual, stok, &amp; batas stok menipis.
            </p>

            <div class="mt-3 space-y-3">
              <For each={values().variants}>
                {(row, i) => (
                  <div class="rounded-xl border border-border bg-muted/30 p-3">
                    <div class="flex items-start justify-between gap-2">
                      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Varian {i() + 1}
                      </p>
                      <button
                        type="button"
                        aria-label={`Hapus varian ${i() + 1}`}
                        onClick={() => removeVariant(i())}
                        disabled={values().variants.length <= 1}
                        class="rounded-md px-1.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </div>

                    <div class="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <Field label="Nama" for={`pf-v-${i()}-name`} required errorMessage={variantErrors()[i()]?.name}>
                        <Input
                          id={`pf-v-${i()}-name`}
                          name="variantName"
                          placeholder="S / M / L"
                          value={row.name}
                          invalid={Boolean(variantErrors()[i()]?.name)}
                          onInput={(e) => setVariantField(i(), 'name', e.currentTarget.value)}
                        />
                      </Field>
                      <Field label="Harga jual" for={`pf-v-${i()}-price`} required errorMessage={variantErrors()[i()]?.sellPrice}>
                        <CurrencyInput
                          id={`pf-v-${i()}-price`}
                          name="sellPrice"
                          placeholder="18000"
                          value={row.sellPrice === '' ? 0 : Number(row.sellPrice)}
                          invalid={Boolean(variantErrors()[i()]?.sellPrice)}
                          onValue={(n) => setVariantField(i(), 'sellPrice', n === 0 ? '' : String(n))}
                        />
                      </Field>
                      <Field label="Stok" for={`pf-v-${i()}-stock`} required errorMessage={variantErrors()[i()]?.stock}>
                        <Input
                          id={`pf-v-${i()}-stock`}
                          name="stock"
                          type="number"
                          inputmode="numeric"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={row.stock}
                          invalid={Boolean(variantErrors()[i()]?.stock)}
                          onInput={(e) => setVariantField(i(), 'stock', e.currentTarget.value)}
                        />
                      </Field>
                      <Field
                        label="Batas stok"
                        for={`pf-v-${i()}-threshold`}
                        errorMessage={variantErrors()[i()]?.lowStockThreshold}
                        hint="Menipis ≤ nilai ini"
                      >
                        <Input
                          id={`pf-v-${i()}-threshold`}
                          name="lowStockThreshold"
                          type="number"
                          inputmode="numeric"
                          min="0"
                          step="1"
                          value={row.lowStockThreshold}
                          invalid={Boolean(variantErrors()[i()]?.lowStockThreshold)}
                          onInput={(e) => setVariantField(i(), 'lowStockThreshold', e.currentTarget.value)}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={errors()['variants']}>
              <p class="mt-2 text-xs font-medium text-destructive" role="alert">
                {errors()['variants']}
              </p>
            </Show>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => props.onClose()}>
            Batal
          </Button>
          <Button type="submit" loading={props.submitting}>
            {props.submitting
              ? isEdit()
                ? 'Menyimpan…'
                : 'Menambahkan…'
              : isEdit()
                ? 'Simpan perubahan'
                : 'Tambah produk'}
          </Button>
        </div>
      </form>
    </Show>
  )
}
