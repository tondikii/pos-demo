import { Link, usePathname, type Href } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  ZoomIn,
  useReducedMotion,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Icon from './Icon'
import { COLORS } from '../theme'

/**
 * Bottom navigation kasir (Fase 2B.8 — wajib per MASTER.md & PRD Flow 3):
 * Kasir / Riwayat / Shift / Sync, selalu terlihat, satu tap akses.
 * - Aktif: primary + label, ikon melebar (Layout). Non-aktif: muted.
 * - Safe area bottom dari insets. Render di layout (app) — bukan di header.
 * - Animasi: tab switch FadeIn + ZoomIn halus; reduced-motion → fade saja.
 */
export default function BottomNav() {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const reducedMotion = useReducedMotion()

  const tabs: { key: string; route: Href; label: string; icon: string; a11y: string }[] = [
    { key: 'pos', route: '/pos', label: 'Kasir', icon: 'cart', a11y: 'Buka kasir' },
    { key: 'history', route: '/history', label: 'Riwayat', icon: 'receipt', a11y: 'Buka riwayat transaksi' },
    { key: 'shift', route: '/shift', label: 'Shift', icon: 'clock', a11y: 'Buka shift' },
    { key: 'sync', route: '/sync', label: 'Sync', icon: 'sync', a11y: 'Buka sinkronisasi' },
  ]

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.route
        return (
          <Link key={tab.key} href={tab.route} asChild>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={tab.a11y}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.tab,
                pressed && active && styles.tabPressedActive,
              ]}
            >
              {active ? (
                <Animated.View
                  key="active"
                  entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(200)}
                  layout={Layout.duration(200)}
                  style={styles.iconWrapActive}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Icon name={tab.icon} size={17} color={COLORS.onPrimary} />
                </Animated.View>
              ) : (
                <Animated.View
                  key="inactive"
                  entering={FadeIn.duration(150)}
                  exiting={FadeOut.duration(100)}
                  style={styles.iconWrap}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Icon name={tab.icon} size={20} color={COLORS.textMuted} />
                </Animated.View>
              )}
              <Animated.Text
                entering={reducedMotion ? FadeIn.duration(150) : ZoomIn.duration(180)}
                style={[styles.label, active ? styles.labelActive : styles.labelIdle]}
              >
                {tab.label}
              </Animated.Text>
            </Pressable>
          </Link>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabPressedActive: { opacity: 0.85 },
  iconWrap: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, fontWeight: '700' },
  labelActive: { color: COLORS.primary },
  labelIdle: { color: COLORS.textMuted },
})
