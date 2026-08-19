import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Icon from '../../src/components/Icon'
import { useSession } from '../../src/auth/session'
import { getQueuedTransactions, type QueuedTxRow, type QueuedTransactionPayload } from '../../src/db/queue'
import { getVoidMeta, voidTransaction } from '../../src/db/void'
import { formatDateTime, formatIDR, formatNumber } from '../../src/lib/format'
import { buildPrintableText } from '../../src/print/print-service'
import { usePrinter } from '../../src/print/use-printer'
import { MOCK_PAYMENT_METHODS } from '../../src/lib/mock-data'
import HeaderBar from '../../src/components/HeaderBar'
import EmptyState from '../../src/components/EmptyState'
import { COLORS } from '../../src/theme'

type HistoryFilter = 'all' | 'pending' | 'syncing' | 'voided' | 'failed'

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'syncing', label: 'Syncing' },
  { key: 'voided', label: 'Voided' },
  { key: 'failed', label: 'Failed' },
]

type TxView = {
  row: QueuedTxRow
  payload: QueuedTransactionPayload
}

function badgeColor(status: QueuedTxRow['status']) {
  switch (status) {
    case 'pending':
      return { bg: COLORS.pendingSoft, fg: '#B45309' }
    case 'syncing':
      return { bg: COLORS.primarySoft, fg: '#1D4ED8' }
    case 'voided':
      return { bg: COLORS.voidedSoft, fg: COLORS.voidedStrong }
    case 'failed':
      return { bg: COLORS.failedSoft, fg: COLORS.dangerStrong }
    default:
      return { bg: COLORS.grayBadge, fg: COLORS.grayBadgeText }
  }
}

function statusLabel(status: QueuedTxRow['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'syncing':
      return 'Syncing'
    case 'voided':
      return 'Voided'
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}

function firstItemLabel(payload: QueuedTransactionPayload): string {
  const first = payload.items[0]
  if (!first) return 'Tanpa item'
  const totalQty = payload.items.reduce((s, i) => s + i.qty, 0)
  if (payload.items.length === 1) {
    return `${first.qty}x ${first.productName}`
  }
  return `${first.qty}x ${first.productName} +${totalQty - first.qty} lainnya`
}

function paymentName(paymentMethodId: string): string {
  return MOCK_PAYMENT_METHODS.find((m) => m.id === paymentMethodId)?.name ?? 'Metode lain'
}

/** Baris riwayat — stagger FadeInDown (delay i*40ms), layout transition saat status berubah. */
function TxRow({
  tx,
  index,
  onPress,
}: {
  tx: TxView
  index: number
  onPress: () => void
}) {
  const reducedMotion = useReducedMotion()
  const { row, payload } = tx
  const badge = badgeColor(row.status)
  const voidMeta = getVoidMeta(payload)

  return (
    <Animated.View
      entering={
        reducedMotion
          ? FadeIn.duration(150)
          : FadeInDown.duration(250).delay(Math.min(index, 8) * 40)
      }
      exiting={FadeOut.duration(120)}
      layout={Layout.duration(250)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.txRow, pressed && styles.txRowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Transaksi ${statusLabel(row.status)} ${formatIDR(payload.total)}`}
      >
        <View style={styles.txMain}>
          <View style={styles.txTop}>
            <Text style={styles.txName} numberOfLines={1}>
              {firstItemLabel(payload)}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>{statusLabel(row.status)}</Text>
            </View>
          </View>
          <Text style={styles.txMeta}>
            {formatDateTime(payload.createdAt)} · {paymentName(payload.paymentMethodId)}
          </Text>
          {voidMeta ? (
            <Text style={styles.txVoidReason} numberOfLines={1}>
              Void: {voidMeta.voidReason}
            </Text>
          ) : null}
        </View>
        <View style={styles.txRight}>
          <Text style={styles.txTotal}>{formatIDR(payload.total)}</Text>
          <Text style={styles.txChevron}>›</Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}

/** Filter chips — status. */
function FilterChips({
  value,
  counts,
  onChange,
}: {
  value: HistoryFilter
  counts: Record<HistoryFilter, number>
  onChange: (f: HistoryFilter) => void
}) {
  return (
    <View style={styles.filterRow}>
      {FILTERS.map((f) => {
        const active = f.key === value
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[styles.filterChip, active && styles.filterChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
              {f.label}
            </Text>
            {counts[f.key] > 0 ? (
              <View style={[styles.filterCount, active && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                  {formatNumber(counts[f.key])}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

/** Modal detail — FadeIn backdrop + ZoomIn card (FadeIn+ZoomIn compose via nested views). */
function DetailModal({
  tx,
  onClose,
  onVoided,
}: {
  tx: TxView
  onClose: () => void
  onVoided: () => void
}) {
  const { row, payload } = tx
  const reducedMotion = useReducedMotion()
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // Feedback cetak ulang: { ok, text } — toast sukses (hijau) / gagal (merah).
  const [printDone, setPrintDone] = useState<{ ok: boolean; text: string } | null>(null)
  const onVoidedRef = useRef(onVoided)
  onVoidedRef.current = onVoided

  const { printing, print } = usePrinter()

  // Error shake saat cetak ulang gagal (skip reduced-motion).
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
    if (printing) return
    const result = await print(buildPrintableText(payload))
    if (result.ok) {
      setPrintDone({ ok: true, text: 'Struk dicetak ulang' })
    } else {
      setPrintDone({ ok: false, text: result.error ?? 'Gagal mencetak struk' })
      triggerShake()
    }
  }, [printing, print, payload, triggerShake])

  const handleShare = useCallback(async () => {
    // Fallback (ARCHITECTURE.md §8): Share.share — printer tidak connect pun tetap bisa.
    await Share.share({
      message: buildPrintableText(payload),
      title: `Struk ${payload.offlineId.slice(0, 8).toUpperCase()}`,
    })
  }, [payload])

  const canVoid =
    (row.status === 'pending' || row.status === 'syncing') && !done

  // Reset state tiap modal dibuka (keyed di parent lewat Animated.View key).
  useEffect(() => {
    setReason('')
    setConfirming(false)
    setSaving(false)
    setError(null)
    setDone(false)
    setPrintDone(null)
  }, [tx.row.offlineId])

  const handleVoid = useCallback(async () => {
    if (!canVoid || reason.trim() === '' || saving) return
    setSaving(true)
    setError(null)
    const result = await voidTransaction(row.offlineId, reason)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone(true)
    // Tutup modal setelah sukses → parent me-refresh list (Layout transition).
    setTimeout(() => {
      onVoidedRef.current()
    }, 450)
  }, [canVoid, reason, saving, row.offlineId])

  const itemCount = payload.items.reduce((s, i) => s + i.qty, 0)
  const voidMeta = getVoidMeta(payload)

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        {/* Backdrop fade */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.modalBackdrop}
        />
        {/* Card zoom */}
        <Animated.View
          key={row.offlineId}
          entering={reducedMotion ? FadeIn.duration(150) : ZoomIn.duration(220)}
          exiting={FadeOut.duration(150)}
          style={styles.modalCard}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Detail Transaksi</Text>
              <Text style={styles.modalSubtitle}>
                {statusLabel(row.status)} · {formatDateTime(payload.createdAt)}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Tutup detail"
            >
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.receiptText}>{buildPrintableText(payload)}</Text>

            {/* Aksi struk: cetak ulang + share — wajib untuk semua transaksi (skill pos-print). */}
            <View style={styles.receiptActions}>
              <Pressable
                onPress={() => void handlePrint()}
                disabled={printing}
                style={({ pressed }) => [
                  styles.printBtn,
                  printing && styles.btnDisabled,
                  pressed && !printing && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cetak ulang struk"
                accessibilityState={{ disabled: printing }}
              >
                <Text style={styles.printBtnText}>{printing ? 'Mencetak…' : 'Cetak Ulang'}</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleShare()}
                style={({ pressed }) => [styles.shareBtn, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Share struk"
              >
                <Text style={styles.shareBtnText}>Share</Text>
              </Pressable>
            </View>

            {voidMeta ? (
              <View style={styles.voidInfoBox}>
                <Text style={styles.voidInfoTitle}>Alasan void</Text>
                <Text style={styles.voidInfoText}>{voidMeta.voidReason}</Text>
                <Text style={styles.voidInfoTime}>Dibatalkan {formatDateTime(voidMeta.voidedAt)}</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {canVoid ? (
              <View style={styles.voidForm}>
                <Text style={styles.voidFormLabel}>Void transaksi ini</Text>
                <Text style={styles.voidFormHint}>
                  Stok varian akan dikembalikan otomatis. Hanya bisa di shift yang masih buka.
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Alasan void (wajib) — mis. pesanan dibatalkan pelanggan"
                  placeholderTextColor="#94A3B8"
                  multiline
                  style={styles.reasonInput}
                  accessibilityLabel="Alasan void"
                />
                {confirming ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmText}>
                      Yakin void transaksi {formatIDR(payload.total)} ini? Stok akan dikembalikan.
                    </Text>
                    <View style={styles.confirmActions}>
                      <Pressable
                        onPress={() => setConfirming(false)}
                        style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.cancelBtnText}>Batal</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleVoid()}
                        disabled={saving || reason.trim() === ''}
                        style={({ pressed }) => [
                          styles.confirmVoidBtn,
                          (saving || reason.trim() === '') && styles.btnDisabled,
                          pressed && styles.btnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: saving || reason.trim() === '' }}
                      >
                        <Text style={styles.confirmVoidBtnText}>
                          {saving ? 'Memproses…' : 'Ya, Void'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setConfirming(true)}
                    disabled={reason.trim() === ''}
                    style={({ pressed }) => [
                      styles.voidBtn,
                      reason.trim() === '' && styles.btnDisabled,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: reason.trim() === '' }}
                  >
                    <Text style={styles.voidBtnText}>Void Transaksi</Text>
                  </Pressable>
                )}
              </View>
            ) : row.status === 'voided' ? (
              <View style={styles.voidedTagRow}>
                <Text style={styles.voidedTag}>Sudah di-void · {formatNumber(itemCount)} item</Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>

        {/* Toast sukses void */}
        {done ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.toast}
            pointerEvents="none"
          >
            <Icon name="check" size={16} color="#16A34A" />
            <View style={styles.toastBody}>
              <Text style={styles.toastTitle}>Transaksi di-void</Text>
              <Text style={styles.toastText}>Stok {formatNumber(itemCount)} item dikembalikan.</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Toast feedback cetak ulang — hijau sukses, merah gagal (shake). */}
        {printDone ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.toast, !printDone.ok && styles.toastError, shakeStyle]}
            pointerEvents="none"
          >
            <Icon name={printDone.ok ? 'check' : 'warning'} size={16} color={printDone.ok ? '#16A34A' : '#DC2626'} />
            <View style={styles.toastBody}>
              <Text style={styles.toastTitle}>{printDone.ok ? 'Berhasil' : 'Gagal cetak'}</Text>
              <Text style={styles.toastText}>{printDone.text}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  )
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useSession()

  const [rows, setRows] = useState<QueuedTxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getQueuedTransactions()
      setRows(all)
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload tiap layar dapat fokus (kembali dari POS / selesai void).
  useEffect(() => {
    void reload()
  }, [reload])

  const views = useMemo<TxView[]>(() => {
    return rows.map((row) => ({ row, payload: row.payload as QueuedTransactionPayload }))
  }, [rows])

  const counts = useMemo<Record<HistoryFilter, number>>(() => {
    const base: Record<HistoryFilter, number> = {
      all: rows.length,
      pending: 0,
      syncing: 0,
      voided: 0,
      failed: 0,
    }
    for (const r of rows) base[r.status] += 1
    return base
  }, [rows])

  const filtered = useMemo(() => {
    if (filter === 'all') return views
    return views.filter((v) => v.row.status === filter)
  }, [views, filter])

  const selected = useMemo(
    () => views.find((v) => v.row.offlineId === selectedId) ?? null,
    [views, selectedId],
  )

  const handleVoided = useCallback(() => {
    setSelectedId(null)
    void reload()
  }, [reload])

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <HeaderBar
        title="Riwayat Transaksi"
        subtitle={session?.outletName ?? 'Outlet'}
        right={<Text style={styles.footerNote}>Fase 2B.4 · Mock lokal</Text>}
      />

      <FilterChips value={filter} counts={counts} onChange={setFilter} />

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.emptyHint}>Memuat riwayat…</Text>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="Belum ada transaksi"
            text={
              filter === 'all'
                ? 'Transaksi dari kasir akan muncul di sini.'
                : `Tidak ada transaksi berstatus ${statusLabel(filter)}.`
            }
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((v, i) => (
              <TxRow
                key={v.row.offlineId}
                tx={v}
                index={i}
                onPress={() => setSelectedId(v.row.offlineId)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {selected ? (
        <DetailModal
          key={selected.row.offlineId}
          tx={selected}
          onClose={() => setSelectedId(null)}
          onVoided={handleVoided}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  footerNote: { fontSize: 11, color: COLORS.textMuted },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  filterChipTextActive: { color: '#FFFFFF' },
  filterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  filterCountTextActive: { color: '#FFFFFF' },

  listContent: { padding: 16, gap: 8, paddingBottom: 40 },
  list: { gap: 8 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  txRowPressed: { backgroundColor: COLORS.bg },
  txMain: { flex: 1, gap: 3, minWidth: 0 },
  txTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  txMeta: { fontSize: 12, color: COLORS.textMuted },
  txVoidReason: { fontSize: 12, color: COLORS.voidedStrong, fontStyle: 'italic' },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txTotal: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  txChevron: { fontSize: 20, color: COLORS.textMuted },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  modalClose: { fontSize: 20, color: COLORS.textMuted, paddingHorizontal: 4 },
  modalScroll: { maxHeight: 420 },
  modalScrollContent: { gap: 12, paddingBottom: 8 },
  receiptText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 17,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },

  receiptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  printBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  printBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  shareBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.text },

  voidInfoBox: {
    backgroundColor: COLORS.voidedSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.voidedBorder,
    padding: 12,
    gap: 2,
  },
  voidInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.voidedStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voidInfoText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  voidInfoTime: { fontSize: 12, color: COLORS.voidedStrong },

  voidForm: { gap: 8 },
  voidFormLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  voidFormHint: { fontSize: 12, color: COLORS.textMuted },
  reasonInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 76,
    fontSize: 14,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  voidBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  voidBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  confirmBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    padding: 12,
    gap: 10,
  },
  confirmText: { fontSize: 13, fontWeight: '600', color: COLORS.dangerStrong, lineHeight: 19 },
  confirmActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  confirmVoidBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  confirmVoidBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  voidedTagRow: { alignItems: 'center' },
  voidedTag: { fontSize: 13, fontWeight: '700', color: COLORS.voidedStrong },

  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.85 },

  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.success,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastError: {
    backgroundColor: COLORS.danger,
  },
  toastIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
  },
  toastBody: { flex: 1, gap: 1 },
  toastTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  toastText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },

  emptyHint: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 8 },
  errorText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
})
