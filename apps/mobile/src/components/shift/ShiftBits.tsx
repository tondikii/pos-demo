import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { COLORS } from '../../theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * Stat baris label+value untuk rekap shift. Variasi:
 * - `accent: 'success' | 'danger'` untuk selisih (0 hijau, bukan nol merah).
 * - `strong` untuk total (font lebih besar).
 */
export function StatRow({
  label,
  value,
  accent,
  strong,
}: {
  label: string
  value: string
  accent?: 'success' | 'danger'
  strong?: boolean
}) {
  const accentColor = accent === 'success' ? COLORS.success : accent === 'danger' ? COLORS.danger : undefined
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, strong && styles.statValueStrong, accentColor && { color: accentColor }]}>
        {value}
      </Text>
    </View>
  )
}

/** Kartu section putih dengan judul kecil — konsisten dengan POS. */
export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  )
}

/** Tombol primair hijau untuk aksi utama (Buka Shift / Tutup Shift). */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }: { pressed: boolean }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.primaryBtnDisabled,
        pressed && !disabled && styles.primaryBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      accessibilityLabel={label}
    >
      <Text style={styles.primaryBtnText}>{loading ? 'Menyimpan…' : label}</Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 4,
  },
  statLabel: { fontSize: 13, color: COLORS.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  statValueStrong: { fontSize: 17, fontWeight: '800' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnPressed: { transform: [{ scale: 0.96 }], backgroundColor: COLORS.successPressed },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
})
