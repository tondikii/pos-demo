import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useReducedMotion,
} from 'react-native-reanimated'

import { useSession } from '../../auth/session'
import { openShift } from '../../db/shift'
import { COLORS } from '../../theme'
import Icon from '../Icon'

/**
 * Prompt "Belum ada shift" di layar kasir (Fase 2B.8 — PRD Flow 3):
 * satu card aksi besar "Buka Shift" (bukan banner kecil), langsung membuka
 * form kas awal inline — tanpa navigasi berlapis. Kasir tetap bisa lihat
 * produk di belakang; CTA besar menonjol.
 *
 * Copywriting (pos-copywriting): judul pendek + solusi + CTA kata kerja.
 * Motion: ZoomIn + FadeIn saat muncul; reduced-motion → FadeIn saja.
 */

type Phase = 'prompt' | 'form'

export default function ShiftPrompt({
  onOpened,
}: {
  /** Dipanggil setelah shift berhasil dibuka (parent me-reload state). */
  onOpened: () => void
}) {
  const { session } = useSession()
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('prompt')
  const [cash, setCash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const enter = reducedMotion ? FadeIn.duration(150) : ZoomIn.duration(250).delay(120)
  const formEnter = reducedMotion ? FadeIn.duration(150) : FadeIn.duration(220)

  const handleOpen = useCallback(async () => {
    if (!session || saving) return
    setError(null)
    setSaving(true)
    const openingCash = Number(cash.replace(/\D/g, '') || 0)
    const result = await openShift(session.outletId, session.id, openingCash)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPhase('prompt')
    setCash('')
    onOpened()
  }, [cash, session, saving, onOpened])

  return (
    <Animated.View entering={enter} exiting={FadeOut.duration(150)} style={styles.wrap}>
      {phase === 'prompt' ? (
        <View style={styles.card}>
          <View style={styles.iconWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Icon name="lock" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Belum ada shift</Text>
          <Text style={styles.text}>
            Buka shift dulu biar transaksi tercatat — cuma sekali tiap mulai jaga toko.
          </Text>
          <Pressable
            onPress={() => setPhase('form')}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            accessibilityRole="button"
            accessibilityLabel="Buka Shift"
          >
            <Text style={styles.ctaText}>Buka Shift</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.View entering={formEnter} exiting={FadeOut.duration(150)} style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Buka Shift</Text>
            <Text style={styles.formSubtitle}>Kas awal di laci — bisa diisi 0.</Text>
          </View>

          <Text style={styles.cashLabel}>Kas awal</Text>
          <TextInput
            value={cash}
            onChangeText={setCash}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={COLORS.placeholder}
            style={styles.cashInput}
            accessibilityLabel="Kas awal, default 0"
          />
          <Text style={styles.formHint}>Jumlah uang tunai di laci saat shift dimulai. Diisi 0 jika kosong.</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={() => void handleOpen()}
            disabled={saving}
            style={({ pressed }) => [
              styles.submit,
              saving && styles.submitDisabled,
              pressed && !saving && styles.submitPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Buka Shift sekarang"
            accessibilityState={{ disabled: saving, busy: saving }}
          >
            <Text style={styles.submitText}>{saving ? 'Membuka…' : 'Buka Shift'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPhase('prompt')
              setError(null)
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Batal membuka shift"
          >
            <Text style={styles.cancelText}>Batal</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  text: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  cta: {
    alignSelf: 'stretch',
    marginTop: 8,
    backgroundColor: COLORS.success,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaPressed: { transform: [{ scale: 0.96 }], backgroundColor: COLORS.successPressed },
  ctaText: { color: COLORS.onSuccess, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 8,
  },
  formHeader: { gap: 2, marginBottom: 2 },
  formTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  formSubtitle: { fontSize: 12, color: COLORS.textMuted },
  cashLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  cashInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  formHint: { fontSize: 11, color: COLORS.textMuted },
  errorText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  submit: {
    marginTop: 6,
    backgroundColor: COLORS.success,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitPressed: { transform: [{ scale: 0.96 }], backgroundColor: COLORS.successPressed },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: COLORS.onSuccess, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  cancelText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    paddingVertical: 6,
  },
})
