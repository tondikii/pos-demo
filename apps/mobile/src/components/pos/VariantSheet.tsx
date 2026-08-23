import React from 'react'
import { Pressable, Text, View } from 'react-native'

import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import { formatIDR, formatNumber } from '../../lib/format'
import type { MockProduct } from '../../lib/mock-data'

/**
 * Variant sheet MINI (thumb zone) — muncul saat kartu produk multi-varian
 * ditap. Tap varian = tambah ke keranjang + sheet langsung tutup (2 tap total).
 */
export default function VariantSheet({
  product,
  onClose,
  onSelect,
}: {
  product: MockProduct | null
  onClose: () => void
  onSelect: (product: MockProduct, variantId: string) => void
}) {
  return (
    <Sheet
      visible={product !== null}
      onClose={onClose}
      title={product?.name ?? ''}
      subtitle="Pilih varian — ketuk untuk tambah"
      maxHeight="60%"
    >
      <View className="px-4 pb-2">
        {product?.variants.map((v) => {
          const out = v.stock <= 0
          return (
            <Pressable
              key={v.id}
              disabled={out}
              onPress={() => onSelect(product, v.id)}
              style={({ pressed }) => [{ opacity: out ? 0.4 : pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`${product.name} ${v.name} ${formatIDR(v.sellPrice)}${out ? ', stok habis' : ''}`}
              accessibilityState={{ disabled: out }}
              className="flex-row items-center justify-between min-h-12 py-3 border-b border-border"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-9 h-9 rounded-xl bg-surfaceMuted items-center justify-center">
                  <Text className="text-[13px] font-extrabold text-text">{v.name}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-text">
                    {v.stock > 0 ? `Stok ${formatNumber(v.stock)}` : 'Stok habis'}
                  </Text>
                  {out ? (
                    <Text className="text-[12px] font-semibold text-danger-pressed mt-0.5">Tidak bisa ditambah</Text>
                  ) : null}
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-[15px] font-extrabold text-text">{formatIDR(v.sellPrice)}</Text>
                {!out ? <Icon name="plus" size={18} color="#16A34A" /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </Sheet>
  )
}