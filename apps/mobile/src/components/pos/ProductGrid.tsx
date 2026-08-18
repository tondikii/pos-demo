import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ZoomIn,
  useReducedMotion,
} from 'react-native-reanimated'

import { formatIDR, formatNumber } from '../../lib/format'
import type { CartVariantRef } from '../../lib/cart'
import type { MockProduct } from '../../lib/mock-data'
import { COLORS } from '../../theme'
import EmptyState from '../EmptyState'

const StaggeredItem = Animated.createAnimatedComponent(View)

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const low = stock <= threshold
  return (
    <View style={[styles.stockBadge, low && styles.stockBadgeLow]}>
      <Text style={[styles.stockBadgeText, low && styles.stockBadgeTextLow]}>
        {low ? `Habis ${stock}` : `Stok ${formatNumber(stock)}`}
      </Text>
    </View>
  )
}

/** Kartu produk: 2 tap untuk tambah (1: pilih varian → 2: varian). */
function ProductCard({ product, index, onVariant }: {
  product: MockProduct
  index: number
  onVariant: (product: MockProduct, variant: CartVariantRef) => void
}) {
  const reducedMotion = useReducedMotion()
  const [picking, setPicking] = useState(false)

  const cheapest = Math.min(...product.variants.map((v) => v.sellPrice))
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)

  return (
    <StaggeredItem
      style={styles.cardWrap}
      entering={
        reducedMotion
          ? FadeIn.duration(200)
          : FadeInDown.duration(250).delay(index * 40)
      }
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.duration(200)}
    >
      <Pressable
        onPress={() => setPicking((p) => !p)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, mulai dari ${formatIDR(cheapest)}`}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.cardPrice}>{formatIDR(cheapest)}</Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardCategory}>{product.category}</Text>
          <StockBadge stock={totalStock} threshold={Math.min(...product.variants.map((v) => v.lowStockThreshold))} />
        </View>
      </Pressable>

      {picking ? (
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(100) : ZoomIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.variantPanel}
        >
          <Text style={styles.variantTitle}>Pilih ukuran · {product.name}</Text>
          {product.variants.map((v) => (
            <Pressable
              key={v.id}
              disabled={v.stock <= 0}
              onPress={() => {
                onVariant(product, v)
                setPicking(false)
              }}
              style={({ pressed }) => [
                styles.variantRow,
                v.stock <= 0 && styles.variantRowDisabled,
                pressed && styles.variantRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${product.name} ukuran ${v.name} ${formatIDR(v.sellPrice)}${v.stock <= 0 ? ', stok habis' : ''}`}
            >
              <View style={styles.variantLeft}>
                <Text style={[styles.variantName, v.stock <= 0 && styles.variantTextDisabled]}>
                  {v.name}
                </Text>
                <Text style={[styles.variantStock, v.stock <= 0 && styles.variantTextDisabled]}>
                  {v.stock <= 0 ? 'Stok habis' : `Stok ${formatNumber(v.stock)}`}
                </Text>
              </View>
              <Text style={[styles.variantPrice, v.stock <= 0 && styles.variantTextDisabled]}>
                {formatIDR(v.sellPrice)}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
    </StaggeredItem>
  )
}

/**
 * Grid produk: filter pills kategori + search, kartu produk dengan stagger
 * entrance (delay i*40ms, FadeInDown + ScaleIn 250ms), varian picker inline.
 * Source: mock cache (Fase 2B.2) — nanti query products_cache.
 */
export default function ProductGrid({
  products,
  categories,
  onAddItem,
}: {
  products: MockProduct[]
  categories: string[]
  onAddItem: (product: MockProduct, variant: CartVariantRef) => void
}) {
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
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cari produk…"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          accessibilityLabel="Cari produk"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Hapus pencarian">
            <Text style={styles.searchClear}>✕</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.pills}>
        {categories.map((cat) => {
          const active = cat === category
          return (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.pill, active && styles.pillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat}</Text>
            </Pressable>
          )
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <ProductCard product={item} index={index} onVariant={onAddItem} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🍽️"
            title="Produk tidak ditemukan"
            text="Coba kata kunci atau kategori lain."
          />
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 18, color: COLORS.textMuted, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0 },
  searchClear: { fontSize: 16, color: COLORS.textMuted, paddingHorizontal: 4 },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  pillTextActive: { color: '#FFFFFF' },
  listContent: { paddingBottom: 16 },
  row: { gap: 10 },
  cardWrap: { flex: 1, maxWidth: '48.5%' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    minHeight: 86,
    justifyContent: 'space-between',
  },
  cardPressed: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  cardTop: { gap: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cardPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardCategory: { fontSize: 11, color: COLORS.textMuted },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceMuted,
  },
  stockBadgeLow: { backgroundColor: COLORS.dangerSoft },
  stockBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  stockBadgeTextLow: { color: COLORS.danger },
  variantPanel: {
    marginTop: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  variantRowPressed: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  variantRowDisabled: { opacity: 0.45 },
  variantLeft: { gap: 2 },
  variantName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  variantStock: { fontSize: 11, color: COLORS.textMuted },
  variantPrice: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  variantTextDisabled: { color: COLORS.textMuted },
})
