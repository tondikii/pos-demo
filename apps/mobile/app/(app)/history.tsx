import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated'

import Icon from '../../src/components/Icon'
import HeaderBar from '../../src/components/HeaderBar'
import StatusPill from '../../src/components/ui/StatusPill'
import EmptyState from '../../src/components/EmptyState'
import Sheet from '../../src/components/ui/Sheet'
import Button from '../../src/components/ui/Button'
import Badge from '../../src/components/ui/Badge'
import { ReceiptView } from '../../src/components/pos/ReceiptView'
import { useSession } from '../../src/auth/session'
import { getQueuedTransactions, type QueuedTxRow, type QueuedTransactionPayload } from '../../src/db/queue'
import { getVoidMeta, voidTransaction } from '../../src/db/void'
import { formatDateTime, formatIDR, formatNumber } from '../../src/lib/format'
import { shareText } from '../../src/lib/share'
import { buildPrintableText } from '../../src/print/print-service'
import { usePrinter } from '../../src/print/use-printer'
import { MOCK_PAYMENT_METHODS } from '../../src/lib/mock-data'

type HistoryFilter = 'all' | 'pending' | 'syncing' | 'voided' | 'failed'

const FILTERS: { key: HistoryFilter; label: string; tone: 'neutral' | 'warning' | 'primary' | 'danger' }[] = [
  { key: 'all', label: 'Semua', tone: 'neutral' },
  { key: 'pending', label: 'Menunggu', tone: 'warning' },
  { key: 'syncing', label: 'Menyinkronkan', tone: 'primary' },
  { key: 'voided', label: 'Dibatalkan', tone: 'neutral' },
  { key: 'failed', label: 'Gagal', tone: 'danger' },
]

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

function paymentName(paymentMethodId: string): string {
  return MOCK_PAYMENT_METHODS.find((m) => m.id === paymentMethodId)?.name ?? 'Metode lain'
}

function TxRow({ tx, index, onPress }: { tx: TxView; index: number; onPress: () => void }) {
  const reducedMotion = useReducedMotion()
  const { row, payload } = tx
  const voidMeta = getVoidMeta(payload)

  return (
    <Animated.View
      entering={
        reducedMotion ? FadeIn.duration(150) : FadeInDown.duration(250).delay(Math.min(index, 8) * 40)
      }
      exiting={FadeOut.duration(120)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`Transaksi ${statusLabel(row.status)} ${formatIDR(payload.total)}`}
        className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4 gap-2 active:bg-bg"
      >
        <View className="flex-1 gap-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Text className="text-[14px] font-bold text-text flex-shrink" numberOfLines={1}>
              {firstItemLabel(payload)}
            </Text>
            <Badge label={statusLabel(row.status)} tone={statusTone(row.status)} />
          </View>
          <Text className="text-[12px] text-text-muted">
            {formatDateTime(payload.createdAt)} · {paymentName(payload.paymentMethodId)}
          </Text>
          {voidMeta ? (
            <Text className="text-[12px] text-gray-badge-text italic" numberOfLines={1}>
              Dibatalkan: {voidMeta.voidReason}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[15px] font-extrabold text-text tabular-nums">{formatIDR(payload.total)}</Text>
          <Icon name="chevron-right" size={18} color="#64748B" />
        </View>
      </Pressable>
    </Animated.View>
  )
}

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-3 py-3"
      className="flex-grow-0"
    >
      {FILTERS.map((f) => {
        const active = f.key === value
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-row items-center gap-1.5 min-h-12 px-3.5 rounded-full border ${
              active ? 'bg-primary border-primary' : 'bg-surface border-border active:bg-surfaceMuted'
            }`}
          >
            <Text className={`text-[13px] font-semibold ${active ? 'text-on-primary' : 'text-text'}`}>
              {f.label}
            </Text>
            {counts[f.key] > 0 ? (
              <View
                className={`min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${
                  active ? 'bg-on-primary/25' : 'bg-surfaceMuted'
                }`}
              >
                <Text className={`text-[11px] font-bold ${active ? 'text-on-primary' : 'text-text-muted'}`}>
                  {formatNumber(counts[f.key])}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** Toast kecil (sukses void / feedback cetak) — slide-in bottom. */
function Toast({
  visible,
  tone,
  title,
  text,
}: {
  visible: boolean
  tone: 'success' | 'danger'
  title: string
  text: string
}) {
  if (!visible) return null
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      className={`absolute left-5 right-5 bottom-6 flex-row items-center gap-3 rounded-2xl px-4 py-3.5 shadow-lg ${
        tone === 'success' ? 'bg-success' : 'bg-danger'
      }`}
    >
      <Icon name={tone === 'success' ? 'check' : 'warning'} size={16} color="#FFFFFF" />
      <View className="flex-1 gap-0.5">
        <Text className="text-[14px] font-extrabold text-on-primary">{title}</Text>
        <Text className="text-[12px] text-on-primary/90">{text}</Text>
      </View>
    </Animated.View>
  )
}

/** Detail transaksi (sheet): struk preview + cetak ulang/bagikan + void. */
function DetailSheet({
  tx,
  onClose,
  onVoided,
}: {
  tx: TxView
  onClose: () => void
  onVoided: () => void
}) {
  const { row, payload } = tx
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [printDone, setPrintDone] = useState<{ ok: boolean; text: string } | null>(null)
  const onVoidedRef = useRef(onVoided)
  onVoidedRef.current = onVoided

  const { printing, print } = usePrinter()

  useEffect(() => {
    setReason('')
    setConfirming(false)
    setSaving(false)
    setError(null)
    setDone(false)
    setPrintDone(null)
  }, [tx.row.offlineId])

  const handlePrint = useCallback(async () => {
    if (printing) return
    const result = await print(buildPrintableText(payload))
    setPrintDone(
      result.ok
        ? { ok: true, text: 'Struk dicetak ulang' }
        : { ok: false, text: result.error ?? 'Gagal mencetak struk' },
    )
  }, [printing, print, payload])

  const handleShare = useCallback(async () => {
    await shareText(
      `Struk ${payload.offlineId.slice(0, 8).toUpperCase()}`,
      buildPrintableText(payload),
    )
  }, [payload])

  const canVoid = (row.status === 'pending' || row.status === 'syncing') && !done

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
    setTimeout(() => onVoidedRef.current(), 450)
  }, [canVoid, reason, saving, row.offlineId])

  const itemCount = payload.items.reduce((s, i) => s + i.qty, 0)
  const voidMeta = getVoidMeta(payload)

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Detail Transaksi"
      subtitle={`${statusLabel(row.status)} · ${formatDateTime(payload.createdAt)}`}
      maxHeight="90%"
    >
      <ScrollView className="px-4 pb-3 gap-3" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ReceiptView transaction={payload} />

        <View className="flex-row gap-3">
          <Button
            label={printing ? 'Mencetak…' : 'Cetak Ulang'}
            icon={<Icon name="printer" size={16} color="#FFFFFF" />}
            onPress={() => void handlePrint()}
            disabled={printing}
            loading={printing}
            className="flex-1"
            size="md"
          />
          <Button
            label="Bagikan Struk"
            variant="outline"
            size="md"
            className="flex-1"
            icon={<Icon name="share" size={16} color="#0F172A" />}
            onPress={() => void handleShare()}
          />
        </View>

        {voidMeta ? (
          <View className="rounded-xl bg-gray-badge border border-border p-3 gap-0.5">
            <Text className="text-[12px] font-bold text-gray-badge-text uppercase tracking-wide">Alasan void</Text>
            <Text className="text-[14px] font-semibold text-text">{voidMeta.voidReason}</Text>
            <Text className="text-[12px] text-gray-badge-text">Dibatalkan {formatDateTime(voidMeta.voidedAt)}</Text>
          </View>
        ) : null}

        {error ? <Text className="text-[13px] font-semibold text-danger">{error}</Text> : null}

        {canVoid ? (
          <View className="gap-2">
            <Text className="text-[15px] font-extrabold text-text">Batalkan transaksi ini</Text>
            <Text className="text-[12px] text-text-muted leading-4">
              Stok varian dikembalikan otomatis. Hanya bisa di shift yang masih buka.
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Alasan void (wajib) — mis. pesanan dibatalkan pelanggan"
              placeholderTextColor="#94A3B8"
              multiline
              className="min-h-[76px] rounded-xl bg-bg border border-border px-3 py-3 text-[14px] text-text textAlignVertical-top"
              accessibilityLabel="Alasan void"
            />
            {confirming ? (
              <View className="rounded-xl bg-danger-soft border border-danger-border p-3 gap-3">
                <Text className="text-[13px] font-semibold text-danger-pressed leading-5">
                  Yakin batalkan transaksi {formatIDR(payload.total)} ini? Stok akan dikembalikan.
                </Text>
                <View className="flex-row gap-2">
                  <Button label="Batal" variant="outline" size="md" className="flex-1" onPress={() => setConfirming(false)} />
                  <Button
                    label={saving ? 'Memproses…' : 'Ya, Batalkan'}
                    variant="danger"
                    size="md"
                    className="flex-1"
                    onPress={() => void handleVoid()}
                    disabled={saving || reason.trim() === ''}
                    loading={saving}
                  />
                </View>
              </View>
            ) : (
              <Button
                label="Batalkan Transaksi"
                variant="danger"
                onPress={() => setConfirming(true)}
                disabled={reason.trim() === ''}
              />
            )}
          </View>
        ) : row.status === 'voided' ? (
          <View className="items-center py-1">
            <Text className="text-[13px] font-bold text-gray-badge-text">
              Sudah dibatalkan · {formatNumber(itemCount)} item
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Toast visible={done} tone="success" title="Transaksi dibatalkan" text={`Stok ${formatNumber(itemCount)} item dikembalikan.`} />
      {printDone ? (
        <Toast
          visible
          tone={printDone.ok ? 'success' : 'danger'}
          title={printDone.ok ? 'Berhasil' : 'Gagal cetak'}
          text={printDone.text}
        />
      ) : null}
    </Sheet>
  )
}

export default function HistoryScreen() {
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

  useEffect(() => {
    void reload()
  }, [reload])

  const views = useMemo<TxView[]>(
    () => rows.map((row) => ({ row, payload: row.payload as QueuedTransactionPayload })),
    [rows],
  )

  const counts = useMemo<Record<HistoryFilter, number>>(() => {
    const base: Record<HistoryFilter, number> = { all: rows.length, pending: 0, syncing: 0, voided: 0, failed: 0 }
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
    <View className="flex-1 bg-bg">
      <HeaderBar title="Riwayat" outlet={session?.outletName ?? 'Outlet'} profile={session?.name ?? 'Kasir'} avatarLabel={session?.outletName ?? 'Outlet'} right={<StatusPill />} />
      <FilterChips value={filter} counts={counts} onChange={setFilter} />

      <ScrollView contentContainerClassName="p-3 pb-8 gap-3" showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text className="text-[13px] text-text-muted py-2">Memuat riwayat…</Text>
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
          filtered.map((v, i) => (
            <TxRow key={v.row.offlineId} tx={v} index={i} onPress={() => setSelectedId(v.row.offlineId)} />
          ))
        )}
      </ScrollView>

      {selected ? (
        <DetailSheet
          key={selected.row.offlineId}
          tx={selected}
          onClose={() => setSelectedId(null)}
          onVoided={handleVoided}
        />
      ) : null}
    </View>
  )
}