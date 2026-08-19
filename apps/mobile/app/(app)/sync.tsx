import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout,
  useReducedMotion,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getQueuedTransactions, type QueuedTxRow, type QueuedTransactionPayload } from '../../src/db/queue'
import { formatDateTime, formatIDR } from '../../src/lib/format'
import { useSync } from '../../src/sync/sync-context'
import HeaderBar from '../../src/components/HeaderBar'
import EmptyState from '../../src/components/EmptyState'
import { COLORS } from '../../src/theme'

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
  if (payload.items.length === 1) return `${first.qty}x ${first.productName}`
  return `${first.qty}x ${first.productName} +${totalQty - first.qty} lainnya`
}

/** Satu baris antrean — stagger FadeInDown (delay i*40ms), Layout saat status berubah. */
function QueueRow({
  tx,
  index,
  onDeleteFailed,
}: {
  tx: TxView
  index: number
  onDeleteFailed: (offlineId: string) => void
}) {
  const reducedMotion = useReducedMotion()
  const { row, payload } = tx
  const badge = badgeColor(row.status)
  const isFailed = row.status === 'failed'

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
      <View style={[styles.txRow, isFailed && styles.txRowFailed]}>
        <View style={styles.txMain}>
          <View style={styles.txTop}>
            <Text style={styles.txName} numberOfLines={1}>
              {firstItemLabel(payload)}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>{statusLabel(row.status)}</Text>
            </View>
          </View>
          <Text style={styles.txMeta}>{formatDateTime(payload.createdAt)}</Text>
          {row.status === 'failed' ? (
            <Text style={styles.txError} numberOfLines={1}>
              {row.error ?? 'Gagal sync'}
            </Text>
          ) : (
            <Text style={styles.txRetries}>
              {row.status === 'pending' || row.status === 'syncing'
                ? `Percobaan ${row.retries}/3`
                : `Percobaan ${row.retries}/3 · selesai`}
            </Text>
          )}
        </View>

        <View style={styles.txRight}>
          <Text style={styles.txTotal}>{formatIDR(payload.total)}</Text>
          {isFailed ? (
            <Pressable
              onPress={() => onDeleteFailed(row.offlineId)}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Hapus transaksi gagal ${formatIDR(payload.total)} dari antrean`}
            >
              <Text style={styles.deleteBtnText}>Hapus</Text>
            </Pressable>
          ) : (
            <Text style={styles.txChevron}>›</Text>
          )}
        </View>
      </View>
    </Animated.View>
  )
}

/** Progress bar sync — animasi width via Layout (reduced-motion aman). */
function SyncProgressBar({ progress, active }: { progress: number; active: boolean }) {
  const reducedMotion = useReducedMotion()
  const width = useMemo<DimensionValue>(
    () => `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
    [progress],
  )
  if (!active) return null
  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={styles.progressTrack}
    >
      <Animated.View
        layout={Layout.duration(250)}
        style={[styles.progressFill, { width }]}
      />
    </Animated.View>
  )
}

export default function SyncScreen() {
  const insets = useSafeAreaInsets()
  const reducedMotion = useReducedMotion()

  const {
    isOnline,
    pendingCount,
    syncingCount,
    failedCount,
    isSyncing,
    progress,
    isOverrideActive,
    syncNow,
    toggleOffline,
    resetOverride,
    refresh,
  } = useSync()

  const [rows, setRows] = useState<QueuedTxRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getQueuedTransactions()
      setRows(all)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Refresh list saat count berubah (item berhasil sync / masuk baru).
  useEffect(() => {
    if (isSyncing) return
    void reload()
  }, [pendingCount, syncingCount, failedCount, isSyncing, reload])

  const views = useMemo<TxView[]>(
    () => rows.map((row) => ({ row, payload: row.payload as QueuedTransactionPayload })),
    [rows],
  )

  const handleSyncNow = useCallback(async () => {
    await syncNow()
    void reload()
  }, [syncNow, reload])

  const handleToggleOffline = useCallback(() => {
    const nextOnline = !isOnline
    toggleOffline()
    if (!nextOnline) {
      // Kini offline — badge di POS ikut oranye; transaksi baru menumpuk pending.
      void reload()
    } else {
      // Kini online — auto-sync (debounce 1.5s) + refresh list.
      setTimeout(() => void reload(), 2000)
    }
  }, [isOnline, toggleOffline, reload])

  const handleResetOverride = useCallback(() => {
    resetOverride()
    void reload()
  }, [resetOverride, reload])

  const handleDeleteFailed = useCallback(
    (offlineId: string) => {
      const tx = views.find((v) => v.row.offlineId === offlineId)
      const total = tx?.payload.total ?? 0
      Alert.alert(
        'Hapus dari antrean?',
        `Transaksi gagal ${formatIDR(total)} akan dihapus permanen dari antrean lokal dan tidak akan disinkronkan.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const { deleteQueuedTransaction } = await import('../../src/db/queue')
                await deleteQueuedTransaction(offlineId)
                await reload()
                await refresh()
              })()
            },
          },
        ],
      )
    },
    [views, reload, refresh],
  )

  const totalCount = pendingCount + syncingCount + failedCount

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <HeaderBar
        title="Sinkronisasi"
        subtitle="Antrean transaksi offline"
        right={<Text style={styles.footerNote}>Fase 2B.5 · Mock</Text>}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status card: online/offline + toggle simulasi */}
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(250)}
          style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOffline]} />
            <View style={styles.statusTextWrap}>
              <Text style={[styles.statusTitle, isOnline ? styles.statusTitleOnline : styles.statusTitleOffline]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isOnline
                  ? pendingCount > 0
                    ? `${pendingCount} transaksi menunggu sync`
                    : 'Semua transaksi tersinkron'
                  : 'Transaksi baru disimpan lokal & akan sync saat online'}
              </Text>
            </View>
            <Pressable
              onPress={handleToggleOffline}
              style={({ pressed }) => [styles.toggleBtn, pressed && styles.toggleBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={isOnline ? 'Simulasikan offline' : 'Simulasikan online'}
            >
              <Text style={styles.toggleBtnText}>
                {isOnline ? 'Jadikan Offline' : 'Jadikan Online'}
              </Text>
            </Pressable>
          </View>

          {isOverrideActive ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.overrideRow}
            >
              <Text style={styles.overrideText}>
                Mode simulasi aktif (mengabaikan deteksi jaringan perangkat).
              </Text>
              <Pressable
                onPress={handleResetOverride}
                style={({ pressed }) => [styles.resetLink, pressed && styles.resetLinkPressed]}
                accessibilityRole="button"
                accessibilityLabel="Kembali ikuti deteksi jaringan perangkat"
              >
                <Text style={styles.resetLinkText}>Ikuti jaringan asli</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          <Text style={styles.autoSyncHint}>
            Auto-sync berjalan saat online · antrean diproses FIFO · max 3 percobaan per transaksi
          </Text>
        </Animated.View>

        {/* Action: sync sekarang + progress */}
        <View style={styles.actionCard}>
          <View style={styles.actionRow}>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Antrean Transaksi</Text>
              <Text style={styles.actionSubtitle}>
                {totalCount} total · {pendingCount} menunggu · {failedCount} gagal
              </Text>
            </View>
            <Pressable
              onPress={() => void handleSyncNow()}
              disabled={isSyncing || !isOnline || pendingCount === 0}
              style={({ pressed }) => [
                styles.syncNowBtn,
                (isSyncing || !isOnline || pendingCount === 0) && styles.syncNowBtnDisabled,
                pressed && styles.syncNowBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isSyncing || !isOnline || pendingCount === 0,
              }}
              accessibilityLabel="Sinkronkan sekarang"
            >
              <Text style={styles.syncNowBtnText}>
                {isSyncing ? 'Menyinkronkan…' : 'Sync Sekarang'}
              </Text>
            </Pressable>
          </View>
          <SyncProgressBar progress={progress} active={isSyncing} />
        </View>

        {/* List antrean */}
        <View style={styles.listSection}>
          {loading ? (
            <Text style={styles.emptyHint}>Memuat antrean…</Text>
          ) : views.length === 0 ? (
            <EmptyState
              icon="signal"
              title="Antrean kosong"
              text="Semua transaksi sudah tersinkron. Transaksi baru yang dibuat saat offline akan muncul di sini."
            />
          ) : (
            <View style={styles.list}>
              {views.map((v, i) => (
                <QueueRow key={v.row.offlineId} tx={v} index={i} onDeleteFailed={handleDeleteFailed} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  footerNote: { fontSize: 11, color: COLORS.textMuted },

  content: { padding: 16, gap: 12, paddingBottom: 40 },

  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  statusCardOnline: { backgroundColor: COLORS.successSoft, borderColor: COLORS.successBorder },
  statusCardOffline: { backgroundColor: COLORS.warningSoft, borderColor: COLORS.warningBorder },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotOnline: { backgroundColor: COLORS.success },
  statusDotOffline: { backgroundColor: COLORS.offlineDot },
  statusTextWrap: { flex: 1, gap: 2 },
  statusTitle: { fontSize: 16, fontWeight: '800' },
  statusTitleOnline: { color: COLORS.successStrong },
  statusTitleOffline: { color: COLORS.warningStrong },
  statusSubtitle: { fontSize: 12, color: COLORS.textMuted },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtnPressed: { backgroundColor: COLORS.surfaceMuted },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  overrideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overrideText: { flex: 1, fontSize: 11, color: COLORS.textMuted },
  resetLink: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.primarySoft },
  resetLinkPressed: { opacity: 0.7 },
  resetLinkText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  autoSyncHint: { fontSize: 11, color: COLORS.textMuted },

  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionTextWrap: { flex: 1, gap: 2 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  actionSubtitle: { fontSize: 12, color: COLORS.textMuted },
  syncNowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  syncNowBtnDisabled: { opacity: 0.45 },
  syncNowBtnPressed: { backgroundColor: COLORS.primaryPressed },
  syncNowBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  listSection: { gap: 8 },
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
  txRowFailed: { backgroundColor: '#FFFBFB' },
  txMain: { flex: 1, gap: 3, minWidth: 0 },
  txTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  txMeta: { fontSize: 12, color: COLORS.textMuted },
  txError: { fontSize: 12, fontWeight: '600', color: COLORS.danger },
  txRetries: { fontSize: 12, color: COLORS.textMuted },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txTotal: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  txChevron: { fontSize: 20, color: COLORS.textMuted },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  deleteBtnPressed: { opacity: 0.75 },
  deleteBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.danger },

  emptyHint: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 8 },
})
