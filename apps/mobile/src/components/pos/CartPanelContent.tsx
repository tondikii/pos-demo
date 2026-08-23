import React, { memo, useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import Icon from '../Icon'
import Button from '../ui/Button'
import EmptyState from '../EmptyState'
import { useCart, type CartItem } from '../../lib/cart'
import { formatIDR } from '../../lib/format'
import type { MockPaymentMethod } from '../../lib/mock-data'

/**
 * Numpad uang diterima — angka 0-9 + hapus + 00 + shortcut nominal cepat
 * (20rb/50rb/100rb/Uang Pas). BUKAN kalkulator scientific: satu fungsi,
 * satu tujuan. Keys 56px, quick chips 48px.
 */
export function CashNumpad({
  onKey,
  onQuick,
}: {
  onKey: (k: string) => void
  onQuick: (amount: number) => void
}) {
  const keys: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', '000']
  const quicks = [
    { label: 'Rp20.000', value: 20000 },
    { label: 'Rp50.000', value: 50000 },
    { label: 'Rp100.000', value: 100000 },
  ]

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {quicks.map((q) => (
          <Pressable
            key={q.value}
            onPress={() => onQuick(q.value)}
            accessibilityRole="button"
            accessibilityLabel={`Isi uang diterima ${q.label}`}
            className="flex-1 min-h-12 justify-center rounded-xl bg-primary-soft border border-border active:bg-primary-pressed/20"
          >
            <Text className="text-center text-[13px] font-bold text-primary-pressed">{q.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => onQuick(-1)}
          accessibilityRole="button"
          accessibilityLabel="Isi uang pas dengan total"
          className="flex-1 min-h-12 justify-center rounded-xl bg-primary border border-primary active:bg-primary-pressed"
        >
          <Text className="text-center text-[13px] font-extrabold text-on-primary">Uang Pas</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap justify-center">
        {keys.map((k) => {
          const isDel = k === 'del'
          return (
            <Pressable
              key={k}
              onPress={() => onKey(k)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              accessibilityRole="button"
              accessibilityLabel={isDel ? 'Hapus digit terakhir' : `Digit ${k}`}
              className="w-[30%] h-14 m-[1%] rounded-xl bg-surface border border-border items-center justify-center active:bg-primary-soft"
            >
              {isDel ? (
                <Icon name="backspace" size={24} color="#64748B" />
              ) : (
                <Text className="text-[20px] font-bold text-text tabular-nums">{k}</Text>
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/** Qty stepper thumb-zone (48px per tombol) + hapus item. */
function QtyStepper({
  qty,
  max,
  onInc,
  onDec,
  onRemove,
  a11yName,
}: {
  qty: number
  max: number
  onInc: () => void
  onDec: () => void
  onRemove: () => void
  a11yName: string
}) {
  const atMax = qty >= max
  return (
    <View className="flex-row items-center justify-between mt-2">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onDec}
          accessibilityRole="button"
          accessibilityLabel={`Kurangi ${a11yName}`}
          className="w-12 h-12 rounded-xl bg-surfaceMuted border border-border items-center justify-center active:bg-primary-soft"
        >
          <Icon name="minus" size={20} color="#0F172A" />
        </Pressable>
        <Text className="text-[13px] font-semibold text-text min-w-6 text-center tabular-nums">{qty}</Text>
        <Pressable
          onPress={onInc}
          disabled={atMax}
          accessibilityRole="button"
          accessibilityLabel={`Tambah ${a11yName}`}
          accessibilityState={{ disabled: atMax }}
          className={`w-12 h-12 rounded-xl border items-center justify-center active:bg-primary-soft ${
            atMax ? 'bg-surfaceMuted border-border opacity-40' : 'bg-surfaceMuted border-border'
          }`}
        >
          <Icon name="plus" size={20} color="#0F172A" />
        </Pressable>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Hapus ${a11yName} dari keranjang`}
        className="w-12 h-12 rounded-xl items-center justify-center active:bg-danger-soft"
      >
        <Icon name="trash" size={18} color="#DC2626" />
      </Pressable>
    </View>
  )
}

/** Baris item keranjang — memo: hanya re-render saat item/qty/note itu berubah. */
const CartItemRow = memo(function CartItemRow({
  item,
  onInc,
  onDec,
  onRemove,
  onSetNote,
}: {
  item: CartItem
  onInc: () => void
  onDec: () => void
  onRemove: () => void
  onSetNote: (note: string) => void
}) {
  const [noteOpen, setNoteOpen] = useState(false)
  return (
    <View className="py-3 border-b border-border/60">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 pr-2">
          <Text className="text-[13px] font-semibold text-text" numberOfLines={1}>
            {item.productName}
          </Text>
          <Text className="text-[11px] text-text-muted mt-0.5">
            {item.variantName} · @{formatIDR(item.sellPrice)}
          </Text>
        </View>
        <Text className="text-[13px] font-medium text-text tabular-nums">
          {formatIDR(item.sellPrice * item.qty)}
        </Text>
      </View>
      <QtyStepper
        qty={item.qty}
        max={item.maxStock}
        onInc={onInc}
        onDec={onDec}
        onRemove={onRemove}
        a11yName={`${item.productName} ${item.variantName}`}
      />

      {item.note ? (
        <Text className="text-[11px] text-text-muted mt-1.5" numberOfLines={1}>
          Catatan: {item.note}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setNoteOpen((o) => !o)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={item.note ? 'Ubah catatan item' : 'Tambah catatan item'}
        accessibilityState={{ expanded: noteOpen }}
        className="mt-1.5 flex-row items-center gap-1.5 h-10 px-2 rounded-lg self-start active:bg-surfaceMuted"
      >
        <Icon name="edit" size={14} color="#2563EB" />
        <Text className="text-[12px] font-medium text-primary">
          {item.note ? 'Ubah catatan' : 'Tambah catatan'}
        </Text>
      </Pressable>

      {noteOpen ? (
        <TextInput
          value={item.note ?? ''}
          onChangeText={onSetNote}
          placeholder="Catatan (opsional) — mis. less sugar, no ice"
          placeholderTextColor="#94A3B8"
          className="mt-1.5 h-11 rounded-xl bg-bg border border-border px-3 text-[13px] text-text"
          accessibilityLabel="Catatan item"
        />
      ) : null}
    </View>
  )
})

/**
 * Konten checkout lengkap — dipakai DUA tempat (satu source of truth):
 * - Tablet landscape: panel tetap kanan (split view).
 * - Phone: bottom sheet cart.
 * Isi: daftar item + qty, subtotal/pajak/total, metode bayar, cash numpad
 * + kembalian, tombol BAYAR (primary) + hint. Header dikelola parent.
 */
export default function CartPanelContent({
  onCheckout,
  canCheckout,
  disabledHint,
  saving,
  paymentMethods,
  onSetNote,
}: {
  onCheckout: () => void
  canCheckout: boolean
  disabledHint?: string
  saving?: boolean
  paymentMethods: MockPaymentMethod[]
  onSetNote: (variantId: string, note: string) => void
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
  } = useCart()

  const cashMethod = paymentMethods.find((m) => m.type === 'cash')
  const isCash = paymentMethodId !== null && paymentMethodId === cashMethod?.id
  const hasItems = items.length > 0

  const handleNumpadKey = useCallback(
    (k: string) => {
      const digits = cashReceivedText.replace(/\D/g, '')
      let next: string
      if (k === 'del') next = digits.slice(0, -1)
      else if (k === '000') next = digits === '' ? '0' : `${digits}000`
      else next = digits + k
      setCashReceivedText(next)
    },
    [cashReceivedText, setCashReceivedText],
  )

  const handleQuick = useCallback(
    (amount: number) => {
      setCashReceivedText(amount < 0 ? String(totals.total) : String(amount))
    },
    [setCashReceivedText, totals.total],
  )

  const hint =
    disabledHint ??
    (!paymentMethodId ? 'Pilih metode bayar' : change === null && isCash ? 'Uang diterima kurang' : undefined)

  return (
    <View className="flex-1 bg-surface">
      {!hasItems ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon="cart" title="Keranjang kosong" text="Ketuk produk untuk mulai." />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="pb-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => (
            <CartItemRow
              key={item.variantId}
              item={item}
              onInc={() => increment(item.variantId)}
              onDec={() => decrement(item.variantId)}
              onRemove={() => removeItem(item.variantId)}
              onSetNote={(note) => onSetNote(item.variantId, note)}
            />
          ))}

          <View className="pt-4 border-t border-border gap-1.5">
            <View className="flex-row justify-between items-baseline">
              <Text className="text-[12px] font-medium text-text-muted">Subtotal</Text>
              <Text className="text-[13px] font-medium text-text tabular-nums">{formatIDR(totals.subtotal)}</Text>
            </View>
            {totals.taxAmount > 0 ? (
              <View className="flex-row justify-between items-baseline">
                <Text className="text-[12px] font-medium text-text-muted">PPN {totals.taxPercent}%</Text>
                <Text className="text-[13px] font-medium text-text tabular-nums">{formatIDR(totals.taxAmount)}</Text>
              </View>
            ) : null}
            {totals.serviceAmount > 0 ? (
              <View className="flex-row justify-between items-baseline">
                <Text className="text-[12px] font-medium text-text-muted">Layanan {totals.servicePercent}%</Text>
                <Text className="text-[13px] font-medium text-text tabular-nums">{formatIDR(totals.serviceAmount)}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between items-baseline pt-2">
              <Text className="text-[13px] font-semibold text-text">Total</Text>
              <Text className="text-[16px] font-bold text-text tabular-nums">{formatIDR(totals.total)}</Text>
            </View>
          </View>

          <View className="pt-4 gap-2 pb-4">
            <Text className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">
              Metode Bayar
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {paymentMethods.map((m) => {
                const active = m.id === paymentMethodId
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setPaymentMethodId(m.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`min-h-11 justify-center px-4 rounded-full border ${
                      active ? 'bg-primary border-primary' : 'bg-surface border-border active:bg-surfaceMuted'
                    }`}
                  >
                    <Text className={`text-[13px] font-medium ${active ? 'text-on-primary' : 'text-text'}`}>
                      {m.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {isCash ? (
              <Animated.View entering={FadeIn.duration(200)} className="gap-2">
                <View className="flex-row items-center justify-between pt-1">
                  <Text className="text-[13px] font-medium text-text-muted">Uang diterima</Text>
                  <Text
                    className={`text-[16px] font-bold tabular-nums ${
                      cashReceivedText === '' ? 'text-text-muted' : 'text-text'
                    }`}
                    accessibilityLabel={`Uang diterima ${cashReceivedText === '' ? 'belum diisi' : `${formatIDR(cashReceived)} rupiah`}`}
                  >
                    {cashReceivedText === '' ? 'Rp —' : formatIDR(cashReceived)}
                  </Text>
                </View>
                <CashNumpad onKey={handleNumpadKey} onQuick={handleQuick} />
                <View className="flex-row items-center justify-between pt-1">
                  <Text className="text-[13px] font-medium text-text-muted">Kembalian</Text>
                  <Text
                    className={`text-[16px] font-bold tabular-nums ${
                      change === null ? 'text-text-muted' : 'text-text'
                    }`}
                  >
                    {change === null ? '—' : formatIDR(change)}
                  </Text>
                </View>
                {change === null && cashReceived > 0 ? (
                  <Text className="text-[12px] font-medium text-danger">
                    Kurang {formatIDR(totals.total - cashReceived)}
                  </Text>
                ) : null}
              </Animated.View>
            ) : paymentMethodId && cashMethod ? (
              <Text className="text-[12px] text-text-muted">
                {paymentMethods.find((m) => m.id === paymentMethodId)?.instruction}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}

      <View className="px-4 pt-3 pb-3 border-t border-border gap-2">
        {hint ? (
          <Text className="text-[12px] text-text-muted text-center font-medium">{hint}</Text>
        ) : null}
        <Button
          label={`BAYAR ${formatIDR(totals.total)}`}
          variant="primary"
          onPress={onCheckout}
          disabled={!canCheckout}
          loading={saving}
          accessibilityLabel="Bayar sekarang"
        />
      </View>
    </View>
  )
}