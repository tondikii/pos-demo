import React, { memo, useEffect, useMemo, useState } from 'react'
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import Icon from '../Icon'
import Button from '../ui/Button'
import { formatIDR, formatNumber } from '../../lib/format'
import type { MockProduct } from '../../lib/mock-data'
import EmptyState from '../EmptyState'

const AnimatedCard = Animated.createAnimatedComponent(View)

/** GAP antar kartu & padding horizontal grid (gap-3 / px-3 = 12). */
const GRID_GAP = 12
const GRID_PAD = 12

/** Badge stok — HANYA saat stok menipis (≤ threshold) atau habis. Stok aman = tanpa badge. */
function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0) {
    return (
      <View className="px-1.5 py-0.5 rounded-md bg-danger-soft">
        <Text className="text-[10px] font-bold text-danger-pressed">Habis</Text>
      </View>
    )
  }
  if (stock > threshold) return null
  return (
    <View className="px-1.5 py-0.5 rounded-md bg-danger-soft">
      <Text className="text-[10px] font-semibold text-danger-pressed">Sisa {formatNumber(stock)}</Text>
    </View>
  )
}

/** Ikon placeholder per kategori — slot foto produk (Moka/Square-style). */
const CATEGORY_ICON: Record<string, string> = {
  Makanan: 'food',
  Minuman: 'glass',
  Kopi: 'mug',
  Snack: 'cookie',
}

/**
 * Kartu produk — slot GAMBAR + nama + harga + kategori/stok, SELURUH kartu
 * clickable:
 * - tap → 1 varian: tambah langsung; multi varian: variant sheet (2 tap).
 * - long-press → +1 langsung (varian pertama) tanpa buka sheet + haptic.
 * - badge qty pojok saat produk sudah ada di cart.
 * - LEBAR FIXED dari prop (bukan flex-1) — baris terakhir yang tidak penuh
 *   TIDAK stretch; semua kartu selebar slot kolomnya.
 * memo(): kartu tidak re-render saat item lain berubah (scroll/status).
 */
const ProductCard = memo(function ProductCard({
  product,
  index,
  qty,
  width,
  rowEnd,
  onAdd,
  onNeedVariant,
  onQuickAdd,
}: {
  product: MockProduct
  index: number
  qty: number
  width: number
  /** true = kartu terakhir di barisnya (tanpa margin kanan). */
  rowEnd: boolean
  onAdd: (product: MockProduct) => void
  onNeedVariant: (product: MockProduct) => void
  onQuickAdd: (product: MockProduct) => void
}) {
  const reducedMotion = useReducedMotion()
  const cheapest = Math.min(...product.variants.map((v) => v.sellPrice))
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
  const threshold = Math.min(...product.variants.map((v) => v.lowStockThreshold))
  const out = totalStock <= 0
  const single = product.variants.length === 1
  const categoryIcon = CATEGORY_ICON[product.category] ?? 'cart'

  return (
    <AnimatedCard
      entering={
        reducedMotion
          ? FadeIn.duration(150)
          : FadeInDown.duration(250).delay(Math.min(index, 8) * 40)
      }
      style={{ width, marginRight: rowEnd ? 0 : GRID_GAP, marginBottom: GRID_GAP }}
    >
      <Pressable
        onPress={() => (out ? undefined : single ? onAdd(product) : onNeedVariant(product))}
        onLongPress={out ? undefined : () => onQuickAdd(product)}
        delayLongPress={400}
        disabled={out}
        style={({ pressed }) => [
          { transform: [{ scale: pressed ? 0.97 : 1 }] },
          { opacity: out ? 0.45 : pressed ? 0.9 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, mulai dari ${formatIDR(cheapest)}${out ? ', stok habis' : ''}${qty > 0 ? `, ${qty} di keranjang` : ''}`}
        accessibilityState={{ disabled: out }}
        className="h-[160px] p-4 rounded-2xl border border-border bg-surface justify-between"
      >
        {/* Slot gambar produk — placeholder ikon kategori (primary-soft), siap untuk foto asli */}
        <View className="relative">
          <View className="h-16 rounded-lg bg-primary-soft items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Icon name={categoryIcon} size={28} color="#2563EB" />
            )}
          </View>
          {qty > 0 ? (
            <View
              className="absolute -top-2 -right-2 min-w-6 h-6 rounded-full bg-primary items-center justify-center px-1.5 border-2 border-surface"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text className="text-[12px] font-extrabold text-on-primary leading-5">{qty}</Text>
            </View>
          ) : null}
        </View>

        <View className="gap-1">
          <Text className={`text-[13px] font-bold text-text ${out ? 'line-through' : ''}`} numberOfLines={1}>
            {product.name}
          </Text>
          <Text className="text-[15px] font-extrabold text-primary tabular-nums">{formatIDR(cheapest)}</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] text-text-muted font-medium" numberOfLines={1}>
              {product.category}
            </Text>
            <StockBadge stock={totalStock} threshold={threshold} />
          </View>
        </View>
      </Pressable>
    </AnimatedCard>
  )
})

/**
 * Skeleton grid saat loading — SHIMMER (pos-motion: shimmer, bukan opacity
 * pulse). Strip terang menyapu via translateX (transform-only), satu timeline
 * sinkron per grup; reduced-motion → statis tanpa strip. Lebar kartu FIXED
 * (sama seperti kartu asli) supaya layout tidak berubah saat data masuk.
 */
function SkeletonGrid({ columns, cardWidth }: { columns: number; cardWidth: number }) {
  const reducedMotion = useReducedMotion()
  const sweep = useSharedValue(0)
  useEffect(() => {
    if (reducedMotion) return
    sweep.value = 0
    sweep.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false)
  }, [reducedMotion, sweep])
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-140, 560]) }],
    opacity: reducedMotion ? 0 : 0.7,
  }))

  const rows = 4
  const cards = Array.from({ length: rows * columns }, (_, i) => i)
  return (
    <View className="pt-1 pb-28" accessibilityLabel="Memuat produk">
      <View className="flex-row flex-wrap gap-3">
        {cards.map((i) => (
          <View
            key={i}
            className="h-[160px] rounded-2xl bg-surfaceMuted overflow-hidden"
            style={{ width: cardWidth }}
          >
            <Animated.View style={stripStyle} className="absolute inset-y-0 w-1/2 bg-white/70" />
          </View>
        ))}
      </View>
    </View>
  )
}

/** Banner error grid — pesan jelas + tombol Retry. */
function GridError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="mx-3 mt-3 rounded-2xl border border-danger-border bg-danger-soft p-3.5 gap-2">
      <View className="flex-row items-center gap-2.5">
        <Icon name="warning" size={20} color="#DC2626" />
        <Text className="flex-1 text-[13px] font-semibold text-danger-pressed leading-5">{message}</Text>
      </View>
      <Button label="Coba Lagi" size="md" variant="primary" onPress={onRetry} className="self-start px-5" />
    </View>
  )
}

/**
 * Grid produk kasir: search instant (real-time, tanpa enter) + filter
 * kategori (dengan counter item) + grid responsif: 2 kolom phone,
 * 4/5/6 kolom tablet sesuai LEBAR KONTAINER (diukur via onLayout).
 * State eksplisit: loading (skeleton shimmer), error (banner + retry),
 * kosong/no-result (empty branded).
 *
 * Layout pakai flexWrap + lebar kartu FIXED (piksel, dari ukuran kontainer):
 * - baris terakhir yang tidak penuh TIDAK stretch — semua kartu selebar slot.
 * - konsisten di phone / tablet / web (tanpa FlatList numColumns yang
 *   memberi flex:1 ke sel → stretch). Virtualisasi tidak diperlukan untuk
 *   katalog mock; jika katalog ratusan item, ganti ke FlashList dengan
 *   perhitungan lebar yang sama.
 */
export default function ProductGrid({
  products,
  categories,
  onAdd,
  onNeedVariant,
  onQuickAdd,
  cartQtys = {},
  categoryCounts = {},
  loading = false,
  error = null,
  onRetry,
}: {
  products: MockProduct[]
  categories: string[]
  onAdd: (product: MockProduct) => void
  onNeedVariant: (product: MockProduct) => void
  onQuickAdd: (product: MockProduct) => void
  /** qty per productId yang sudah ada di cart → badge pojok kartu. */
  cartQtys?: Record<string, number>
  /** jumlah produk per kategori → counter di chip filter. */
  categoryCounts?: Record<string, number>
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const { width: windowWidth } = useWindowDimensions()
  const [containerWidth, setContainerWidth] = useState(0)

  // Fallback ke lebar window sebelum onLayout pertama (layout awal sudah benar).
  const measured = containerWidth > 0 ? containerWidth : windowWidth
  // Tablet landscape: 6 kolom (≥1400) / 5 (≥1100) / 4 (≥768); phone 2.
  const numColumns = measured >= 1400 ? 6 : measured >= 1100 ? 5 : measured >= 768 ? 4 : 2
  const cardWidth = Math.floor((measured - GRID_PAD * 2 - GRID_GAP * (numColumns - 1)) / numColumns)
  const [category, setCategory] = useState('Semua')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'Semua' && p.category !== category) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [products, category, query])

  return (
    <View className="flex-1" onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <View className="px-3 pt-2.5">
        <View className="flex-row items-center h-12 rounded-xl bg-surface border border-border px-3 gap-2">
          <Icon name="search" size={18} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari produk…"
            placeholderTextColor="#94A3B8"
            className="flex-1 text-[15px] font-regular text-text p-0"
            accessibilityLabel="Cari produk"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Hapus pencarian">
              <Icon name="close" size={16} color="#64748B" />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 py-2.5"
          className="flex-grow-0"
        >
          {categories.map((cat) => {
            const active = cat === category
            const count = cat === 'Semua' ? products.length : (categoryCounts[cat] ?? 0)
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`flex-row items-center min-h-12 justify-center px-3.5 rounded-full border ${
                  active ? 'bg-primary border-primary' : 'bg-surface border-border active:bg-surfaceMuted'
                }`}
              >
                <Text className={`text-[13px] font-semibold ${active ? 'text-on-primary' : 'text-text'}`}>
                  {cat}
                </Text>
                <View
                  className={`ml-1.5 min-w-[20px] h-5 rounded-full items-center justify-center px-1 ${
                    active ? 'bg-on-primary/25' : 'bg-surfaceMuted'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${active ? 'text-on-primary' : 'text-gray-badge-text'}`}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {loading ? (
        <SkeletonGrid columns={numColumns} cardWidth={cardWidth} />
      ) : error ? (
        <GridError message={error} onRetry={onRetry ?? (() => {})} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="pt-1 pb-28"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View className="py-16">
              <EmptyState
                icon="food"
                title="Produk tidak ditemukan"
                text="Coba kata kunci atau kategori lain."
              />
            </View>
          ) : (
            <View className="px-3 flex-row flex-wrap">
              {filtered.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  qty={cartQtys[product.id] ?? 0}
                  width={cardWidth}
                  rowEnd={index % numColumns === numColumns - 1}
                  onAdd={onAdd}
                  onNeedVariant={onNeedVariant}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}