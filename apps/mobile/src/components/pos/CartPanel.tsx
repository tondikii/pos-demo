import React from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated'

import { useCart } from '../../lib/cart'
import { formatIDR } from '../../lib/format'
import type { MockPaymentMethod } from '../../lib/mock-data'
import { COLORS } from '../../theme'
import EmptyState from '../EmptyState'

const AnimatedRow = Animated.createAnimatedComponent(View)

/** Qty control kompak: − qty + (layout LinearTransition saat bertambah/hapus). */
function CartItemRow({
  productName,
  variantName,
  sellPrice,
  qty,
  maxStock,
  onInc,
  onDec,
  onRemove,
}: {
  productName: string
  variantName: string
  sellPrice: number
  qty: number
  maxStock: number
  onInc: () => void
  onDec: () => void
  onRemove: () => void
}) {
  const reducedMotion = useReducedMotion()
  const atMax = qty >= maxStock

  return (
    <AnimatedRow
      layout={LinearTransition.duration(220)}
      entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(220)}
      exiting={FadeOut.duration(120)}
      style={styles.cartItem}
    >
      <View style={styles.cartItemMain}>
        <View style={styles.cartItemNameRow}>
          <Text style={styles.cartItemName} numberOfLines={1}>{productName}</Text>
          {maxStock === 0 ? (
            <Text style={styles.outOfStockTag}>stok habis</Text>
          ) : null}
        </View>
        <Text style={styles.cartItemMeta}>
          {variantName} · {formatIDR(sellPrice)}
        </Text>
        <View style={styles.qtyRow}>
          <Pressable
            onPress={onDec}
            style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Kurangi ${productName} ${variantName}`}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </Pressable>
          <Text style={styles.qtyText}>{qty}</Text>
          <Pressable
            onPress={onInc}
            disabled={atMax}
            style={({ pressed }) => [styles.qtyBtn, atMax && styles.qtyBtnDisabled, pressed && styles.qtyBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Tambah ${productName} ${variantName}`}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
          {atMax ? <Text style={styles.maxHint}>maks {maxStock}</Text> : null}
        </View>
      </View>
      <View style={styles.cartItemRight}>
        <Text style={styles.cartItemLineTotal}>{formatIDR(sellPrice * qty)}</Text>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
          accessibilityRole="button"
          accessibilityLabel={`Hapus ${productName} ${variantName} dari keranjang`}
        >
          <Text style={styles.removeText}>Hapus</Text>
        </Pressable>
      </View>
    </AnimatedRow>
  )
}

/**
 * Panel keranjang: daftar item + qty control, subtotal/pajak/layanan/total,
 * chips metode bayar, input cash + kembalian, tombol BAYAR.
 */
export default function CartPanel({
  paymentMethods,
}: {
  paymentMethods: MockPaymentMethod[]
}) {
  const {
    items,
    totals,
    paymentMethodId,
    setPaymentMethodId,
    cashReceivedText,
    setCashReceivedText,
    cashReceived,
    change,
    increment,
    decrement,
    removeItem,
    clear,
  } = useCart()

  const hasItems = items.length > 0
  const cashMethod = paymentMethods.find((m) => m.type === 'cash')

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Keranjang</Text>
        {hasItems ? (
          <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kosongkan keranjang">
            <Text style={styles.clearText}>Kosongkan</Text>
          </Pressable>
        ) : null}
      </View>

      {hasItems ? (
        <ScrollView style={styles.itemList} contentContainerStyle={styles.itemListContent} bounces={false}>
          {items.map((item) => (
            <CartItemRow
              key={item.variantId}
              productName={item.productName}
              variantName={item.variantName}
              sellPrice={item.sellPrice}
              qty={item.qty}
              maxStock={item.maxStock}
              onInc={() => increment(item.variantId)}
              onDec={() => decrement(item.variantId)}
              onRemove={() => removeItem(item.variantId)}
            />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="cart"
          title="Keranjang kosong"
          text="Ketuk produk untuk mulai."
        />
      )}

      {hasItems ? (
        <>
          <View style={styles.totals}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatIDR(totals.subtotal)}</Text>
            </View>
            {totals.taxAmount > 0 ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>PPN {totals.taxPercent}%</Text>
                <Text style={styles.totalValue}>{formatIDR(totals.taxAmount)}</Text>
              </View>
            ) : null}
            {totals.serviceAmount > 0 ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Layanan {totals.servicePercent}%</Text>
                <Text style={styles.totalValue}>{formatIDR(totals.serviceAmount)}</Text>
              </View>
            ) : null}
            <View style={[styles.totalLine, styles.totalGrand]}>
              <Text style={styles.totalGrandLabel}>Total</Text>
              <Text style={styles.totalGrandValue}>{formatIDR(totals.total)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Metode bayar</Text>
            <View style={styles.pmRow}>
              {paymentMethods.map((m) => {
                const active = m.id === paymentMethodId
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setPaymentMethodId(m.id)}
                    style={[styles.pmChip, active && styles.pmChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.pmChipText, active && styles.pmChipTextActive]}>{m.name}</Text>
                  </Pressable>
                )
              })}
            </View>
            {paymentMethodId && cashMethod && paymentMethodId === cashMethod.id ? (
              <View style={styles.cashWrap}>
                <Text style={styles.cashLabel}>Uang diterima</Text>
                <View style={styles.cashInputWrap}>
                  <Text style={styles.cashPrefix} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    Rp
                  </Text>
                  <TextInput
                    value={cashReceivedText}
                    onChangeText={setCashReceivedText}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    style={styles.cashInput}
                    accessibilityLabel="Uang diterima dalam Rupiah"
                  />
                </View>
                <View style={styles.changeLine}>
                  <Text style={styles.changeLabel}>Kembalian</Text>
                  <Text style={[styles.changeValue, change === null && styles.changeValueInvalid]}>
                    {change === null ? '—' : formatIDR(change)}
                  </Text>
                </View>
                <Text style={styles.cashHint}>
                  {change === null && cashReceived > 0
                    ? `Kurang ${formatIDR(totals.total - cashReceived)}`
                    : 'Terima uang tunai, hitung kembalian.'}
                </Text>
              </View>
            ) : null}
            {paymentMethodId && cashMethod && paymentMethodId !== cashMethod.id ? (
              <Text style={styles.pmHint}>
                {paymentMethods.find((m) => m.id === paymentMethodId)?.instruction}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  clearText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  itemList: { flex: 1 },
  itemListContent: { paddingBottom: 4 },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  cartItemMain: { flex: 1, gap: 2 },
  cartItemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartItemName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  outOfStockTag: { fontSize: 10, fontWeight: '700', color: COLORS.danger },
  cartItemMeta: { fontSize: 12, color: COLORS.textMuted },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyBtnPressed: { backgroundColor: COLORS.primarySoft },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  qtyText: { fontSize: 15, fontWeight: '700', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  maxHint: { fontSize: 11, color: COLORS.textMuted },
  cartItemRight: { alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  cartItemLineTotal: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  removeText: { fontSize: 12, fontWeight: '600', color: COLORS.danger },
  totals: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    gap: 4,
  },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, color: COLORS.textMuted },
  totalValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  totalGrand: { marginTop: 2 },
  totalGrandLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  totalGrandValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  section: { marginTop: 10, gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pmRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pmChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pmChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pmChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  pmChipTextActive: { color: '#FFFFFF' },
  pmHint: { fontSize: 12, color: COLORS.textMuted },
  cashWrap: { gap: 6 },
  cashLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  cashInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cashPrefix: {
    paddingLeft: 12,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  cashInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  changeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  changeLabel: { fontSize: 13, color: COLORS.textMuted },
  changeValue: { fontSize: 16, fontWeight: '800', color: COLORS.success },
  changeValueInvalid: { color: COLORS.textMuted },
  cashHint: { fontSize: 12, color: COLORS.textMuted },
})
