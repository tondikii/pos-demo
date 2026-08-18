import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { buildPrintableText } from '../../print/print-service'
import { usePrinter } from '../../print/use-printer'
import { formatIDR } from '../../lib/format'
import type { QueuedTransactionPayload } from '../../db/queue'
import { COLORS } from '../../theme'
import PrinterStatus from '../print/PrinterStatus'

type PrintFeedback = 'idle' | 'success' | 'error'

/**
 * Preview struk 58mm setelah pembayaran sukses (Fase 2B.6).
 * - "Cetak Struk" → printReceipt mock (600ms, 15% gagal) — feedback sukses
 *   (check ZoomIn) / gagal (error shake withSequence); tidak pernah blok
 *   transaksi: print hanya post-payment.
 * - "Share Struk" → Share.share fallback (bisa kirim ke WA/notes) —
 *   sesuai ARCHITECTURE.md §8: fallback wajib saat printer tidak connect.
 * - "Tutup" → kembali ke kasir; badge status printer + "Coba Hubungkan" di
 *   footer. Reduced-motion dihormati (ZoomIn → FadeIn, tanpa shake).
 */
export default function StrukPreview({
  visible,
  transaction,
  onClose,
}: {
  visible: boolean
  transaction: QueuedTransactionPayload | null
  onClose: () => void
}) {
  const reducedMotion = useReducedMotion()
  const { printing, print } = usePrinter()

  const [feedback, setFeedback] = useState<PrintFeedback>('idle')
  const [printError, setPrintError] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset feedback tiap modal dibuka / transaksi ganti (keyed di parent).
  useEffect(() => {
    if (visible) {
      setFeedback('idle')
      setPrintError(null)
    }
  }, [visible, transaction?.offlineId])

  // Feedback sukses hilang sendiri setelah 2.5s — struk sudah "jadi".
  useEffect(() => {
    if (feedback !== 'success') return
    resetTimer.current = setTimeout(() => setFeedback('idle'), 2500)
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [feedback])

  // Error shake (gagal cetak) — skip saat reduced-motion.
  const shakeX = useSharedValue(0)
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const triggerShake = useCallback(() => {
    if (reducedMotion) return
    shakeX.value = 0
    shakeX.value = withSequence(
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    )
  }, [reducedMotion, shakeX])

  const handlePrint = useCallback(async () => {
    if (!transaction || printing) return
    const result = await print(buildPrintableText(transaction))
    if (result.ok) {
      setFeedback('success')
      setPrintError(null)
    } else {
      setFeedback('error')
      setPrintError(result.error ?? 'Gagal mencetak struk')
      triggerShake()
    }
  }, [transaction, printing, print, triggerShake])

  const handleShare = useCallback(async () => {
    if (!transaction) return
    // Fallback (ARCHITECTURE.md §8): Share.share — user bisa kirim ke WA dsb.
    await Share.share({
      message: buildPrintableText(transaction),
      title: `Struk ${transaction.offlineId.slice(0, 8).toUpperCase()}`,
    })
  }, [transaction])

  if (!visible || !transaction) return null
  const itemCount = transaction.items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Transaksi Berhasil</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Tutup struk">
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.receiptScroll} contentContainerStyle={styles.receiptContent} bounces={false}>
            <Text style={styles.receiptText}>{buildPrintableText(transaction)}</Text>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.printerRow}>
              <PrinterStatus />
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL ({itemCount} item)</Text>
              <Text style={styles.totalValue}>{formatIDR(transaction.total)}</Text>
            </View>

            {feedback === 'success' ? (
              <Animated.View
                entering={reducedMotion ? FadeIn.duration(150) : ZoomIn.duration(250)}
                exiting={FadeOut.duration(150)}
                style={[styles.feedbackBox, styles.feedbackSuccess]}
              >
                <Text style={styles.feedbackIcon}>✓</Text>
                <Text style={styles.feedbackSuccessText}>Struk terkirim ke printer</Text>
              </Animated.View>
            ) : null}

            {feedback === 'error' ? (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(150)}
                style={[styles.feedbackBox, styles.feedbackError, shakeStyle]}
              >
                <Text style={styles.feedbackIcon}>⚠</Text>
                <Text style={styles.feedbackErrorText}>{printError}</Text>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={() => void handlePrint()}
              disabled={printing}
              style={({ pressed }) => [
                styles.primaryBtn,
                printing && styles.primaryBtnDisabled,
                pressed && !printing && styles.primaryBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cetak struk"
              accessibilityState={{ disabled: printing }}
            >
              <Text style={styles.primaryBtnText}>{printing ? 'Mencetak…' : 'Cetak Struk'}</Text>
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => void handleShare()}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Share struk"
              >
                <Text style={styles.secondaryBtnText}>Share Struk</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtnBox, pressed && styles.secondaryBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Tutup dan kembali ke kasir"
              >
                <Text style={styles.secondaryBtnText}>Tutup</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeBtn: {
    fontSize: 20,
    color: COLORS.textMuted,
    paddingHorizontal: 4,
  },
  receiptScroll: {
    maxHeight: 380,
  },
  receiptContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  receiptText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 17,
    color: COLORS.text,
  },
  footer: {
    marginTop: 14,
    gap: 10,
  },
  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  feedbackSuccess: {
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  feedbackError: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  feedbackIcon: {
    fontSize: 15,
    fontWeight: '900',
  },
  feedbackSuccessText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.successStrong,
  },
  feedbackErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dangerStrong,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
    transform: [{ scale: 0.98 }],
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeBtnBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: COLORS.surfaceMuted,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
})
