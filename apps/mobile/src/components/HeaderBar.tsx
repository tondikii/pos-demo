import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { COLORS, SPACING } from '../theme'

/**
 * Header konsisten untuk semua screen (Fase 2B.8 — navigasi pindah ke
 * bottom nav): judul 800 + subtitle (outlet), aksi kanan opsional
 * (badge sync / tombol kontekstual). Tanpa tombol kembali — berpindah
 * screen cukup lewat BottomNav.
 */
export default function HeaderBar({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: never
  right?: React.ReactNode
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  titleWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
})
