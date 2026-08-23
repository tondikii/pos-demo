import { Link, usePathname, type Href } from 'expo-router'
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Icon from './Icon'
import { useSync } from '../sync/sync-context'

/** Tinggi bar navigasi (tanpa safe area) — dipakai layout cart bar di POS. */
export const TAB_BAR_BASE_HEIGHT = 58

/**
 * Bottom navigation kasir (WAJIB per MASTER.md & PRD Flow 3):
 * Kasir / Riwayat / Shift / Sync — 4 tab fixed, satu tap akses.
 * - Ikon 24px, label 11-12px, active = ikon + label primary + pill lembut.
 * - Badge counter di tab Sync: oranye (pending) / merah (failed).
 * - Touch target tab ≥48px; transform/opacity only.
 */
export default function BottomNav() {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { pendingCount, failedCount } = useSync()

  const tabs: {
    key: string
    route: Href
    label: string
    icon: string
    a11y: string
    badge?: number
    badgeTone?: 'warning' | 'danger'
  }[] = [
    { key: 'pos', route: '/pos', label: 'Kasir', icon: 'cart', a11y: 'Buka kasir' },
    { key: 'history', route: '/history', label: 'Riwayat', icon: 'receipt', a11y: 'Buka riwayat transaksi' },
    { key: 'shift', route: '/shift', label: 'Shift', icon: 'clock', a11y: 'Buka shift' },
    {
      key: 'sync',
      route: '/sync',
      label: 'Pengaturan',
      icon: 'settings',
      a11y: 'Buka pengaturan',
      badge: failedCount > 0 ? failedCount : pendingCount > 0 ? pendingCount : 0,
      badgeTone: failedCount > 0 ? 'danger' : 'warning',
    },
  ]

  return (
    <View
      className="flex-row w-full bg-surface border-t border-border"
      style={{ paddingBottom: Math.max(insets.bottom, 8), paddingTop: 4 }}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const clean = pathname.split('?')[0].replace(/\/$/, '')
        const active = clean === tab.route
        return (
          <Link key={tab.key} href={tab.route} asChild>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={tab.a11y}
              accessibilityState={{ selected: active }}
              className="flex-1 items-center justify-center pt-1.5 pb-1 active:opacity-80"
              style={{ minHeight: 48 }}
            >
              <Animated.View
                className={`flex-row items-center justify-center rounded-full px-3.5 h-7 ${
                  active ? 'bg-primary-soft' : 'bg-transparent'
                }`}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Icon name={tab.icon} size={24} color={active ? '#2563EB' : '#64748B'} />
                {tab.badge ? (
                  <View
                    className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${
                      tab.badgeTone === 'danger' ? 'bg-danger' : 'bg-warning-icon'
                    }`}
                  >
                    <Text className="text-[10px] font-extrabold text-on-primary leading-4">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                ) : null}
              </Animated.View>
              <Text
                className={`mt-0.5 text-[11px] leading-4 ${
                  active ? 'text-primary font-bold' : 'text-text-muted font-medium'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          </Link>
        )
      })}
    </View>
  )
}