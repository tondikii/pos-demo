import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut, Layout, useReducedMotion } from 'react-native-reanimated'

import { usePrinter } from '../../print/use-printer'

/**
 * Badge status printer 58mm — Fase 2B.6 (mock BLE).
 * - Hijau "RPP02N (58mm)" saat terhubung / oranye "Printer putus".
 * - Tombol "Coba Hubungkan" (mock connect 1.5s) saat putus — transaksi
 *   tetap bisa jalan tanpa printer (print hanya post-payment).
 * - Animasi: badge FadeIn+Layout saat status berubah; reduced-motion dihormati.
 */
export default function PrinterStatus() {
  const reducedMotion = useReducedMotion()
  const { connected, printerName, connect } = usePrinter()
  const [connecting, setConnecting] = React.useState(false)

  const handleConnect = () => {
    if (connecting || connected) return
    setConnecting(true)
    void connect().finally(() => setConnecting(false))
  }

  const label = connected ? printerName : connecting ? 'Menghubungkan…' : 'Printer putus'

  return (
    <Animated.View
      key={connected ? 'on' : 'off'}
      entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(250)}
      exiting={FadeOut.duration(120)}
      layout={Layout.duration(250)}
    >
      <View style={styles.badgeRow}>
        <View style={[styles.badge, connected ? styles.badgeOn : styles.badgeOff]}>
          <View style={[styles.dot, connected ? styles.dotOn : styles.dotOff]} />
          <Text
            style={[
              styles.badgeText,
              connected ? styles.badgeTextOn : styles.badgeTextOff,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
        {!connected ? (
          <Pressable
            onPress={handleConnect}
            disabled={connecting}
            style={({ pressed }) => [
              styles.connectBtn,
              connecting && styles.connectBtnDisabled,
              pressed && styles.connectBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={connecting ? 'Menghubungkan printer' : 'Coba hubungkan printer'}
            accessibilityState={{ disabled: connecting }}
          >
            <Text style={styles.connectBtnText}>
              {connecting ? '…' : 'Coba Hubungkan'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeOn: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  badgeOff: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  dotOn: { backgroundColor: '#16A34A' },
  dotOff: { backgroundColor: '#F59E0B' },
  badgeText: { fontSize: 11, fontWeight: '700', maxWidth: 140 },
  badgeTextOn: { color: '#15803D' },
  badgeTextOff: { color: '#B45309' },
  connectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  connectBtnPressed: { backgroundColor: '#FFEDD5' },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
})
