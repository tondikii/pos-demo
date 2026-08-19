import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useCart } from '../../lib/cart'
import { formatIDRCompact } from '../../lib/format'
import { COLORS } from '../../theme'

/**
 * Bar bayar sticky di bawah panel keranjang — selalu terlihat walau daftar
 * item panjang. Press scale 0.96 via transform style (reduced-motion aware,
 * skala halus tidak termasuk motion yang mengganggu).
 */
export default function PayBar({
  disabled,
  onPress,
  disabledHint,
}: {
  disabled: boolean
  onPress: () => void
  /** Hint pengganti saat disabled karena alasan di luar keranjang (mis. shift belum buka). */
  disabledHint?: string
}) {
  const { totals, change } = useCart()
  const hasItems = totals.itemCount > 0

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryCount}>
          {hasItems ? `${totals.itemCount} item` : 'Belum ada item'}
        </Text>
        <Text style={styles.summaryTotal}>{formatIDRCompact(totals.total)}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          !hasItems && styles.buttonEmpty,
          pressed && !disabled && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Bayar"
        accessibilityState={{ disabled }}
      >
        <Text style={styles.buttonText}>BAYAR</Text>
      </Pressable>
      {disabled && hasItems ? (
        <Text style={styles.hint}>
          {disabledHint ?? (change === null ? 'Pilih metode bayar & isi uang diterima' : 'Pilih metode bayar')}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingTop: 8,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  summaryCount: { fontSize: 12, color: COLORS.textMuted },
  summaryTotal: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  button: {
    backgroundColor: COLORS.success,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonEmpty: { backgroundColor: COLORS.placeholder },
  buttonPressed: { transform: [{ scale: 0.96 }], backgroundColor: COLORS.successPressed },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  hint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
})
