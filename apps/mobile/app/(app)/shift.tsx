import React, { useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated'

import Icon from '../../src/components/Icon'
import HeaderBar from '../../src/components/HeaderBar'
import StatusPill from '../../src/components/ui/StatusPill'
import EmptyState from '../../src/components/EmptyState'
import Sheet from '../../src/components/ui/Sheet'
import Button from '../../src/components/ui/Button'
import Badge from '../../src/components/ui/Badge'
import { useSession } from '../../src/auth/session'
import { closeShift, openShift, shiftStatusLabel, type ShiftRow } from '../../src/db/shift'
import { useActiveShift, useShiftHistory, type ShiftHistoryItem } from '../../src/db/use-shift'
import { formatDateTime, formatIDR, formatNumber } from '../../src/lib/format'

/** Baris label + value untuk rekap shift. */
function StatRow({
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
  const color = accent === 'success' ? 'text-success' : accent === 'danger' ? 'text-danger' : 'text-text'
  return (
    <View className="flex-row justify-between items-baseline py-1">
      <Text className="text-[13px] text-text-muted">{label}</Text>
      <Text
        className={`tabular-nums font-bold ${strong ? 'text-[17px] font-extrabold' : 'text-[14px]'} ${color}`}
      >
        {value}
      </Text>
    </View>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="rounded-2xl border border-border bg-surface p-4 gap-1">
      {title ? (
        <Text className="text-[12px] font-bold text-text-muted uppercase tracking-wide mb-1">{title}</Text>
      ) : null}
      {children}
    </View>
  )
}

type ShiftSummary = {
  count: number
  total: number
  cashTotal: number
  byPaymentMethod: { paymentMethodId: string; paymentMethodName: string; count: number; total: number }[]
}

/** Rekap shift berjalan — ringkasan saja; form tutup ada di footer (thumb zone). */
function RunningShiftCard({ shift, summary }: { shift: ShiftRow; summary: ShiftSummary }) {
  return (
    <Animated.View entering={FadeIn.duration(250)} className="gap-3">
      <View className="flex-row items-center gap-2 px-1">
        <View className="w-2.5 h-2.5 rounded-full bg-success" />
        <Text className="text-[15px] font-extrabold text-text">Shift Berjalan</Text>
        <Text className="text-[12px] text-text-muted ml-auto">Dibuka {formatDateTime(shift.openedAt)}</Text>
      </View>

      <Card>
        <StatRow label="Kas awal" value={formatIDR(shift.openingCash)} />
        <StatRow label="Total transaksi" value={`${formatNumber(summary.count)}x`} />
        <StatRow label="Omzet" value={formatIDR(summary.total)} strong />
      </Card>

      <Card title="Per Metode Bayar">
        {summary.byPaymentMethod.length === 0 ? (
          <Text className="text-[13px] text-text-muted py-1">Belum ada transaksi.</Text>
        ) : (
          summary.byPaymentMethod.map((pm, i) => (
            <View key={`${pm.paymentMethodName}-${i}`} className="flex-row justify-between items-baseline py-1">
              <Text className="text-[13px] text-text-muted flex-shrink">
                {pm.paymentMethodName} · {pm.count}x
              </Text>
              <Text className="text-[14px] font-bold text-text tabular-nums">{formatIDR(pm.total)}</Text>
            </View>
          ))
        )}
      </Card>
    </Animated.View>
  )
}

/** Kartu info "belum ada shift" — ringkas, bukan dominan. */
function NoShiftCard() {
  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <View className="rounded-2xl border border-border bg-surface p-4 flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full bg-primary-soft items-center justify-center">
          <Icon name="clock" size={22} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-extrabold text-text">Belum ada shift</Text>
          <Text className="text-[12px] text-text-muted leading-4">
            Isi kas awal di bawah lalu buka shift untuk mulai melayani.
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

/** Detail shift (sheet) — rekap lengkap. */
function ShiftDetailSheet({ item, onClose }: { item: ShiftHistoryItem; onClose: () => void }) {
  const isOpen = item.status === 'open'
  return (
    <Sheet
      visible
      onClose={onClose}
      title="Detail Shift"
      subtitle={formatDateTime(item.openedAt)}
      maxHeight="85%"
    >
      <ScrollView className="px-4 pb-4 gap-3" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3">
          <Badge label={shiftStatusLabel(item.status)} tone={isOpen ? 'success' : 'neutral'} />
          {item.closedAt ? (
            <Text className="text-[12px] text-text-muted">Ditutup {formatDateTime(item.closedAt)}</Text>
          ) : null}
        </View>

        <Card>
          <StatRow label="Kas awal" value={formatIDR(item.openingCash)} />
          <StatRow label="Total transaksi" value={`${formatNumber(item.summary.count)}x`} />
          <StatRow label="Omzet" value={formatIDR(item.summary.total)} strong />
        </Card>

        <Card title="Per Metode Bayar">
          {item.summary.byPaymentMethod.length === 0 ? (
            <Text className="text-[13px] text-text-muted py-1">Belum ada transaksi.</Text>
          ) : (
            item.summary.byPaymentMethod.map((pm, i) => (
              <View key={`${pm.paymentMethodName}-${i}`} className="flex-row justify-between items-baseline py-1">
                <Text className="text-[13px] text-text-muted flex-shrink">
                  {pm.paymentMethodName} · {formatNumber(pm.count)}x
                </Text>
                <Text className="text-[14px] font-bold text-text tabular-nums">{formatIDR(pm.total)}</Text>
              </View>
            ))
          )}
        </Card>

        <Card>
          <StatRow label="Kas ekspektasi" value={formatIDR(item.expectedCash)} />
          <StatRow label="Kas aktual" value={item.actualCash === null ? '—' : formatIDR(item.actualCash)} />
          <StatRow
            label="Selisih"
            value={item.difference === null ? '—' : formatIDR(item.difference)}
            accent={item.difference === null ? undefined : item.difference === 0 ? 'success' : 'danger'}
          />
          {item.difference !== null && item.difference !== 0 ? (
            <Text
              className={`text-[12px] font-semibold mt-1 ${item.difference > 0 ? 'text-primary' : 'text-danger'}`}
            >
              {item.difference > 0
                ? `Lebih ${formatIDR(item.difference)} dari ekspektasi`
                : `Kurang ${formatIDR(Math.abs(item.difference))} dari ekspektasi`}
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </Sheet>
  )
}

/** Riwayat shift — list ringkas. */
function HistoryList({ onSelect }: { onSelect: (item: ShiftHistoryItem) => void }) {
  const { session } = useSession()
  const { history, loading } = useShiftHistory(session?.outletId ?? '', session?.id)
  const reducedMotion = useReducedMotion()

  return (
    <View className="gap-2">
      <Text className="text-[12px] font-bold text-text-muted uppercase tracking-wide px-1">
        Riwayat Shift
      </Text>
      {loading ? (
        <Text className="text-[13px] text-text-muted py-2">Memuat riwayat…</Text>
      ) : history.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Belum ada shift"
          text="Buka shift pertama untuk mulai bertransaksi."
        />
      ) : (
        history.map((h, i) => {
          const isOpen = h.status === 'open'
          const difference = h.difference ?? null
          return (
            <Animated.View
              key={h.id}
              entering={
                reducedMotion
                  ? FadeIn.duration(150)
                  : FadeInDown.duration(250).delay(Math.min(i, 8) * 40)
              }
            >
              <Pressable
                onPress={() => onSelect(h)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`Shift ${shiftStatusLabel(h.status)} ${formatDateTime(h.openedAt)}`}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4 gap-2 active:bg-bg"
              >
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Badge label={shiftStatusLabel(h.status)} tone={isOpen ? 'success' : 'neutral'} />
                    <Text className="text-[12px] text-text-muted flex-shrink">{formatDateTime(h.openedAt)}</Text>
                  </View>
                  <Text className="text-[13px] font-semibold text-text">
                    {h.summary.count} transaksi · omzet {formatIDR(h.summary.total)}
                  </Text>
                  {difference !== null ? (
                    <Text
                      className={`text-[13px] font-bold ${
                        difference === 0
                          ? 'text-success'
                          : difference > 0
                            ? 'text-primary'
                            : 'text-danger'
                      }`}
                    >
                      Selisih {formatIDR(difference)}{' '}
                      {difference > 0 ? 'lebih' : difference < 0 ? 'kurang' : '(pas)'}
                    </Text>
                  ) : null}
                </View>
                <Icon name="chevron-right" size={18} color="#64748B" />
              </Pressable>
            </Animated.View>
          )
        })
      )}
    </View>
  )
}

/** CTA footer buka shift — kas awal + tombol di thumb zone. */
function OpenShiftCTA({ onOpened }: { onOpened: () => void }) {
  const { session } = useSession()
  const [cash, setCash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    setCash('')
    onOpened()
  }, [cash, session, saving, onOpened])

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center h-12 rounded-xl bg-bg border border-border px-3 gap-1.5">
        <Text className="text-[14px] font-bold text-text-muted" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          Rp
        </Text>
        <TextInput
          value={cash}
          onChangeText={setCash}
          keyboardType="number-pad"
          placeholder="Kas awal (0 jika kosong)"
          placeholderTextColor="#94A3B8"
          className="flex-1 text-[15px] font-bold text-text p-0"
          accessibilityLabel="Kas awal, default 0"
        />
      </View>
      {error ? <Text className="text-[12px] font-semibold text-danger">{error}</Text> : null}
      <Button
        label={saving ? 'Membuka…' : 'Buka Shift'}
        variant="primary"
        onPress={() => void handleOpen()}
        disabled={saving}
        loading={saving}
      />
    </View>
  )
}

/** CTA footer tutup shift — kas aktual + selisih live + tombol (thumb zone). */
function CloseShiftCTA({
  shift,
  onClosed,
}: {
  shift: ShiftRow
  onClosed: () => void
}) {
  const { session } = useSession()
  const [cash, setCash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const actualPreview = Number(cash.replace(/\D/g, '') || 0)
  const differencePreview = actualPreview - shift.expectedCash

  const handleClose = useCallback(async () => {
    if (!session || saving) return
    setError(null)
    setSaving(true)
    const actual = Number(cash.replace(/\D/g, '') || 0)
    const result = await closeShift(shift.id, session.outletId, session.id, actual)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onClosed()
  }, [cash, session, saving, shift.id, onClosed])

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center h-12 rounded-xl bg-bg border border-border px-3 gap-1.5">
          <Text className="text-[14px] font-bold text-text-muted" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Rp
          </Text>
          <TextInput
            value={cash}
            onChangeText={setCash}
            keyboardType="number-pad"
            placeholder="Kas aktual di laci"
            placeholderTextColor="#94A3B8"
            className="flex-1 text-[15px] font-bold text-text p-0"
            accessibilityLabel="Kas aktual di laci"
          />
        </View>
        <View className="items-end">
          <Text className="text-[10px] text-text-muted font-medium">Selisih</Text>
          <Text
            className={`text-[15px] font-extrabold tabular-nums ${
              cash === ''
                ? 'text-text-muted'
                : differencePreview === 0
                  ? 'text-success'
                  : differencePreview > 0
                    ? 'text-primary'
                    : 'text-danger'
            }`}
          >
            {cash === '' ? '—' : formatIDR(differencePreview)}
          </Text>
        </View>
      </View>
      {error ? <Text className="text-[12px] font-semibold text-danger">{error}</Text> : null}
      <Button
        label={saving ? 'Menutup…' : 'Tutup Shift & Hitung Selisih'}
        variant="primary"
        onPress={() => void handleClose()}
        disabled={saving}
        loading={saving}
      />
    </View>
  )
}

export default function ShiftScreen() {
  const { session } = useSession()
  const { active, loading, reload } = useActiveShift(session?.outletId ?? '', session?.id ?? '')
  const [selectedShift, setSelectedShift] = useState<ShiftHistoryItem | null>(null)

  const activeShift = active?.shift ?? null
  const summary: ShiftSummary = active?.summary ?? { count: 0, total: 0, cashTotal: 0, byPaymentMethod: [] }

  return (
    <View className="flex-1 bg-bg">
      <HeaderBar title="Shift" subtitle={session?.outletName ?? 'Outlet'} right={<StatusPill />} />

      <ScrollView
        contentContainerClassName="p-3 pb-6 gap-3"
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {loading ? (
          <Text className="text-[13px] text-text-muted py-2">Memuat shift…</Text>
        ) : activeShift?.status === 'open' ? (
          <RunningShiftCard shift={activeShift} summary={summary} />
        ) : (
          <NoShiftCard />
        )}

        {active?.autoClosed ? (
          <Animated.View
            entering={FadeIn.duration(250)}
            className="rounded-xl bg-warning-soft border border-warning-border p-3"
          >
            <Text className="text-[13px] font-semibold text-warning leading-5">{active.autoClosedNote}</Text>
          </Animated.View>
        ) : null}

        <HistoryList onSelect={setSelectedShift} />
      </ScrollView>

      {/* CTA thumb zone: aksi utama shift selalu di 1/3 bawah. */}
      <View className="px-3 pt-3 pb-3 border-t border-border bg-surface gap-2">
        {loading ? null : activeShift?.status === 'open' ? (
          <CloseShiftCTA shift={activeShift} onClosed={() => void reload()} />
        ) : (
          <OpenShiftCTA onOpened={() => void reload()} />
        )}
      </View>

      {selectedShift ? (
        <ShiftDetailSheet key={selectedShift.id} item={selectedShift} onClose={() => setSelectedShift(null)} />
      ) : null}
    </View>
  )
}