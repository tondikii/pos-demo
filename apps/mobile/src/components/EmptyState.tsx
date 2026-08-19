import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { COLORS, SPACING } from '../theme'
import Icon from './Icon'

/**
 * Empty state konsisten untuk semua screen (Fase 2B.7):
 * emoji/ikon + judul + teks bantu + aksi opsional.
 * Dipakai di POS (produk kosong / keranjang kosong), History, Shift, Sync.
 */
export default function EmptyState({
  icon = 'inbox',
  title,
  text,
  action,
}: {
  icon?: string
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <View style={styles.box} accessibilityRole="summary">
      <View style={styles.iconWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon name={icon} size={30} color={COLORS.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 6,
  },
  iconWrap: { marginBottom: 2 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  text: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  action: { marginTop: SPACING.md },
})
