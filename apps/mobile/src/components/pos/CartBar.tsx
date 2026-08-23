import React from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated'

import Icon from '../Icon'
import { formatIDRCompact, formatNumber } from '../../lib/format'

/**
 * Cart bar (collapsed) — bar ringkas FIXED di atas bottom nav, SELALU tampil
 * (termasuk keranjang kosong) supaya posisinya stabil di thumb zone:
 * [icon] N item · total  [BAYAR]. Satu Pressable utuh → tap expand ke
 * cart sheet. Saat kosong: label muted + tombol BAYAR non-aktif.
 */
export default function CartBar({
  itemCount,
  total,
  onPress,
}: {
  itemCount: number
  total: number
  onPress: () => void
}) {
  const reducedMotion = useReducedMotion()
  const empty = itemCount === 0

  return (
    <Animated.View
      entering={reducedMotion ? FadeInUp.duration(150) : FadeInUp.duration(250)}
      className="px-3"
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        accessibilityRole="button"
        accessibilityLabel={
          empty ? 'Buka keranjang, masih kosong' : `Buka keranjang, ${itemCount} item, total ${formatIDRCompact(total)}`
        }
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2 shadow-sm"
      >
        <View
          className={`w-11 h-11 rounded-full items-center justify-center ${
            empty ? 'bg-surfaceMuted' : 'bg-primary-soft'
          }`}
        >
          <Icon name="cart" size={22} color={empty ? '#94A3B8' : '#2563EB'} />
        </View>
        <View className="flex-1">
          <Text className={`text-[12px] font-semibold ${empty ? 'text-text-muted' : 'text-text-muted'}`}>
            {empty ? 'Keranjang kosong' : `${formatNumber(itemCount)} item`}
          </Text>
          <Text className={`text-[17px] font-extrabold leading-5 ${empty ? 'text-text-muted' : 'text-text'}`}>
            {formatIDRCompact(total)}
          </Text>
        </View>
        <View
          className={`h-12 px-5 rounded-xl items-center justify-center ${
            empty ? 'bg-surfaceMuted border border-border' : 'bg-primary'
          }`}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text className={`text-[15px] font-extrabold ${empty ? 'text-text-muted' : 'text-on-primary'}`}>
            BAYAR
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}