import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { useSync } from '../../sync/sync-context'

/**
 * Badge status sync di header POS (Fase 2B.5).
 * - Hijau "Online · N menunggu sync" (FadeIn saat berubah) / oranye "Offline".
 * - Tombol sync manual: ikon refresh ↻ spin (withRepeat) saat syncing;
 *   reduced-motion → ikon statis. Badge sendiri pressable → buka screen sync.
 * - Setelah transaksi baru masuk (pendingCount naik saat online), auto-sync
 *   provider akan jalan — badge menampilkan N menunggu sampai selesai.
 */
export default function SyncBadge() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const { isOnline, pendingCount, isSyncing, syncNow } = useSync()
  const spin = useSharedValue(0)

  // Spin loop saat syncing; berhenti (kembali ke 0) setelah selesai.
  useEffect(() => {
    if (isSyncing && !reducedMotion) {
      spin.value = 0
      spin.value = withRepeat(withTiming(360, { duration: 900 }), -1)
    } else {
      spin.value = withTiming(0, { duration: 200 })
    }
    return () => {
      spin.value = 0
    }
  }, [isSyncing, reducedMotion, spin])

  const handleManualSync = () => {
    if (!isSyncing) void syncNow()
  }

  const handleOpenSync = () => {
    router.push('/sync')
  }

  const isOnlineGreen = isOnline
  const label =
    isOnline && pendingCount > 0
      ? `Online · ${pendingCount} menunggu sync`
      : isOnline
        ? 'Online'
        : 'Offline'

  return (
    <Animated.View
      key={`${isOnline ? 'online' : 'offline'}-${pendingCount}`}
      entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(250)}
      exiting={FadeOut.duration(120)}
      layout={Layout.duration(250)}
    >
      <View style={styles.badgeRow}>
        <Pressable
          onPress={handleOpenSync}
          style={({ pressed }) => [
            styles.badge,
            isOnlineGreen ? styles.badgeOnline : styles.badgeOffline,
            pressed && styles.badgePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isOnline
              ? pendingCount > 0
                ? `Online, ${pendingCount} transaksi menunggu sync. Buka layar sync.`
                : 'Online. Buka layar sync.'
              : 'Offline. Buka layar sync.'
          }
        >
          <View
            style={[
              styles.dot,
              isOnlineGreen ? styles.dotOnline : styles.dotOffline,
            ]}
          />
          <Text
            style={[
              styles.badgeText,
              isOnlineGreen ? styles.badgeTextOnline : styles.badgeTextOffline,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Pressable>

        {isOnlineGreen ? (
          <Pressable
            onPress={handleManualSync}
            disabled={isSyncing}
            style={({ pressed }) => [
              styles.syncBtn,
              isSyncing && styles.syncBtnActive,
              pressed && styles.syncBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isSyncing ? 'Sedang menyinkronkan' : 'Sinkronkan sekarang'}
            accessibilityState={{ disabled: isSyncing }}
          >
            <Animated.View style={{ transform: [{ rotate: `${spin.value}deg` }] }}>
              <Text style={[styles.syncBtnIcon, isSyncing && styles.syncBtnIconActive]}>↻</Text>
            </Animated.View>
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
  badgeOnline: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  badgeOffline: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  badgePressed: { opacity: 0.8 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  dotOnline: { backgroundColor: '#16A34A' },
  dotOffline: { backgroundColor: '#F59E0B' },
  badgeText: { fontSize: 11, fontWeight: '700', maxWidth: 150 },
  badgeTextOnline: { color: '#15803D' },
  badgeTextOffline: { color: '#B45309' },
  syncBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  syncBtnPressed: { backgroundColor: '#F1F5F9' },
  syncBtnIcon: { fontSize: 16, color: '#64748B' },
  syncBtnIconActive: { color: '#2563EB' },
})
