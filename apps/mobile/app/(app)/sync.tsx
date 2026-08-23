import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View, type DimensionValue } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated'

import Icon from '../../src/components/Icon'
import HeaderBar from '../../src/components/HeaderBar'
import StatusPill from '../../src/components/ui/StatusPill'
import EmptyState from '../../src/components/EmptyState'
import Button from '../../src/components/ui/Button'
import Badge from '../../src/components/ui/Badge'
import { getQueuedTransactions, type QueuedTxRow, type QueuedTransactionPayload } from '../../src/db/queue'
import { formatDateTime, formatIDR } from '../../src/lib/format'
import { useSync } from '../../src/sync/sync-context'
import { usePrinter } from '../../src/print/use-printer'

type TxView = { row: QueuedTxRow; payload: QueuedTransactionPayload }

function statusLabel(status: QueuedTxRow['status']): string {
  switch (status) {
    case 'pending':
      return 'Menunggu'
    case 'syncing':
      return 'Menyinkronkan'
    case 'voided':
      return 'Dibatalkan'
    case 'failed':
      return 'Gagal'
    default:
      return status
  }
}

function statusTone(status: QueuedTxRow['status']): 'warning' | 'primary' | 'danger' | 'neutral' {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'syncing':
      return 'primary'
    case 'voided':
      return 'neutral'
    case 'failed':
      return 'danger'
    default:
      return 'neutral'
  }
}

function firstItemLabel(payload: QueuedTransactionPayload): string {
  const first = payload.items[0]
  if (!first) return 'Tanpa item'
  const totalQty = payload.items.reduce((s, i) => s + i.qty, 0)
  if (payload.items.length === 1) return `${first.qty}x ${first.productName}`
  return `${first.qty}x ${first.productName} +${totalQty - first.qty} lainnya`
}

function QueueRow({ tx, index, onDeleteFailed }: { tx: TxView; index: number; onDeleteFailed: (offlineId: string) => void }) {
  const reducedMotion = useReducedMotion()
  const { row, payload } = tx
  const isFailed = row.status === 'failed'

  return (
    <Animated.View
      entering={
        reducedMotion ? FadeIn.duration(150) : FadeInDown.duration(250).delay(Math.min(index, 8) * 40)
      }
      exiting={FadeOut.duration(120)}
    >
      <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4 gap-2">
        <View className="flex-1 gap-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Text className="text-[14px] font-bold text-text flex-shrink" numberOfLines={1}>
              {firstItemLabel(payload)}
            </Text>
            <Badge label={statusLabel(row.status)} tone={statusTone(row.status)} />
          </View>
          <Text className="text-[12px] text-text-muted">{formatDateTime(payload.createdAt)}</Text>
          {isFailed ? (
            <Text className="text-[12px] font-semibold text-danger" numberOfLines={1}>
              {row.error ?? 'Gagal sinkron'}
            </Text>
          ) : (
            <Text className="text-[12px] text-text-muted">
              Percobaan {row.retries}/3{row.status === 'voided' ? ' · selesai' : ''}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-[15px] font-extrabold text-text tabular-nums">{formatIDR(payload.total)}</Text>
          {isFailed ? (
            <Pressable
              onPress={() => onDeleteFailed(row.offlineId)}
              accessibilityRole="button"
              accessibilityLabel={`Hapus transaksi gagal ${formatIDR(payload.total)} dari antrean`}
              className="h-11 px-3 rounded-xl bg-danger-soft border border-danger-border items-center justify-center active:opacity-75"
            >
              <Text className="text-[12px] font-extrabold text-danger">Hapus</Text>
            </Pressable>
          ) : (
            <Icon name="chevron-right" size={18} color="#64748B" />
          )}
        </View>
      </View>
    </Animated.View>
  )
}

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
      className="h-1.5 rounded-full bg-border overflow-hidden"
    >
      <View className="h-full rounded-full bg-primary" style={{ width }} />
    </Animated.View>
  )
}

/** Kartu printer 58mm — detail pairing ada di sini (bukan chip di header POS). */
function PrinterCard() {
  const { connected, printerName, printing, connect } = usePrinter()
  const [connecting, setConnecting] = useState(false)

  const handleConnect = useCallback(() => {
    if (connecting || connected) return
    setConnecting(true)
    void connect().finally(() => setConnecting(false))
  }, [connecting, connected, connect])

  return (
    <View className="rounded-2xl border border-border bg-surface p-4 gap-3">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-primary-soft items-center justify-center">
          <Icon name="bluetooth" size={20} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-extrabold text-text">Printer Struk 58mm</Text>
          <Text className="text-[12px] text-text-muted">
            {connected ? printerName ?? 'Terhubung' : 'Belum terhubung · transaksi tetap jalan'}
          </Text>
        </View>
        <View className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-success' : 'bg-offline-dot'}`} />
      </View>
      {!connected ? (
        <Button
          label={connecting ? 'Menghubungkan…' : 'Hubungkan Printer'}
          variant="outline"
          size="md"
          onPress={() => void handleConnect()}
          disabled={connecting}
          loading={connecting}
          icon={<Icon name="bluetooth" size={16} color="#0F172A" />}
        />
      ) : (
        <Text className="text-[12px] text-success-pressed font-semibold">
          {printing ? 'Mencetak…' : 'Siap cetak — struk keluar otomatis setelah bayar.'}
        </Text>
      )}
    </View>
  )
}

export default function SyncScreen() {
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
    toggleOffline()
    if (isOnline) {
      void reload()
    } else {
      setTimeout(() => void reload(), 2000)
    }
  }, [isOnline, toggleOffline, reload])

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
  const syncDisabled = isSyncing || !isOnline || pendingCount === 0

  return (
    <View className="flex-1 bg-bg">
      <HeaderBar title="Sync" subtitle="Antrean transaksi offline" right={<StatusPill />} />

      <ScrollView contentContainerClassName="p-3 pb-8 gap-3" showsVerticalScrollIndicator={false}>
        {/* Status online/offline + toggle simulasi */}
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(250)}
          className={`rounded-2xl border p-4 gap-3 ${
            isOnline ? 'bg-success-soft border-success-border' : 'bg-warning-soft border-warning-border'
          }`}
        >
          <View className="flex-row items-center gap-3">
            <View className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-success' : 'bg-offline-dot'}`} />
            <View className="flex-1">
              <Text className={`text-[15px] font-extrabold ${isOnline ? 'text-success-pressed' : 'text-warning-strong'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Text className="text-[12px] text-text-muted">
                {isOnline
                  ? pendingCount > 0
                    ? `${pendingCount} transaksi menunggu sinkron`
                    : 'Semua transaksi tersinkron'
                  : 'Transaksi baru disimpan lokal & akan sinkron saat online'}
              </Text>
            </View>
            <Pressable
              onPress={handleToggleOffline}
              accessibilityRole="button"
              accessibilityLabel={isOnline ? 'Simulasikan offline' : 'Simulasikan online'}
              className="min-h-12 justify-center px-3.5 rounded-xl bg-surface border border-border active:bg-surfaceMuted"
            >
              <Text className="text-[12px] font-bold text-text">
                {isOnline ? 'Jadikan Offline' : 'Jadikan Online'}
              </Text>
            </Pressable>
          </View>

          {isOverrideActive ? (
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[11px] text-text-muted">
                Mode simulasi aktif (mengabaikan deteksi jaringan perangkat).
              </Text>
              <Pressable
                onPress={resetOverride}
                accessibilityRole="button"
                accessibilityLabel="Kembali ikuti deteksi jaringan perangkat"
                className="px-3 h-8 rounded-lg bg-primary-soft items-center justify-center active:opacity-70"
              >
                <Text className="text-[11px] font-bold text-primary">Ikuti jaringan asli</Text>
              </Pressable>
            </View>
          ) : null}

          <Text className="text-[11px] text-text-muted">
            Auto-sinkron saat online · antrean diproses urut · maks 3 percobaan per transaksi
          </Text>
        </Animated.View>

        <PrinterCard />

        {/* Aksi sync + progres */}
        <View className="rounded-2xl border border-border bg-surface p-4 gap-3">
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-[15px] font-extrabold text-text">Antrean Transaksi</Text>
              <Text className="text-[12px] text-text-muted">
                {totalCount} total · {pendingCount} menunggu · {failedCount} gagal
              </Text>
            </View>
            <Button
              label={isSyncing ? 'Menyinkronkan…' : 'Sinkron Sekarang'}
              size="md"
              onPress={() => void handleSyncNow()}
              disabled={syncDisabled}
              loading={isSyncing}
            />
          </View>
          <SyncProgressBar progress={progress} active={isSyncing} />
        </View>

        {/* List antrean */}
        {loading ? (
          <Text className="text-[13px] text-text-muted py-2">Memuat antrean…</Text>
        ) : views.length === 0 ? (
          <EmptyState
            icon="signal"
            title="Antrean kosong"
            text="Semua transaksi sudah tersinkron. Transaksi offline akan muncul di sini."
          />
        ) : (
          <View className="gap-3">
            {views.map((v, i) => (
              <QueueRow key={v.row.offlineId} tx={v} index={i} onDeleteFailed={handleDeleteFailed} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}