import React, { useCallback, useState } from 'react'
import {
  Pressable,
  ScrollView,
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
  useReducedMotion,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSession } from '../../src/auth/session'
import { closeShift, openShift, shiftStatusLabel, type ShiftRow } from '../../src/db/shift'
import { useActiveShift, useShiftHistory } from '../../src/db/use-shift'
import { formatDateTime, formatIDR, formatNumber } from '../../src/lib/format'
import { Card, PrimaryButton, StatRow } from '../../src/components/shift/ShiftBits'
import HeaderBar from '../../src/components/HeaderBar'
import EmptyState from '../../src/components/EmptyState'
import { COLORS } from '../../src/theme'

/** Input kas (nominal Rupiah, format saat blur) — dipakai form buka & tutup. */
function CashInput({
  value,
  onChangeText,
  placeholder,
  label,
}: {
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  label: string
}) {
  return (
    <View style={styles.cashField}>
      <Text style={styles.cashLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder={placeholder ?? '0'}
        placeholderTextColor="#94A3B8"
        style={styles.cashInput}
        accessibilityLabel={label}
      />
    </View>
  )
}

/** Rekap metode bayar dari ringkasan shift. */
function PaymentMethodBreakdown({
  summary,
}: {
  summary: { byPaymentMethod: { paymentMethodName: string; count: number; total: number }[] }
}) {
  if (summary.byPaymentMethod.length === 0) {
    return <Text style={styles.emptyHint}>Belum ada transaksi.</Text>
  }
  return (
    <View style={styles.pmList}>
      {summary.byPaymentMethod.map((pm, i) => (
        <View key={`${pm.paymentMethodName}-${i}`} style={styles.pmRow}>
          <Text style={styles.pmName}>
            {pm.paymentMethodName} · {pm.count}x
          </Text>
          <Text style={styles.pmTotal}>{formatIDR(pm.total)}</Text>
        </View>
      ))}
    </View>
  )
}

/** Form Buka Shift (kas awal, boleh 0). */
function OpenShiftForm({ onMutationDone }: { onMutationDone: () => void }) {
  const { session } = useSession()
  const [cash, setCash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const reducedMotion = useReducedMotion()

  const handleOpen = useCallback(async () => {
    if (!session) return
    setError(null)
    setSaving(true)
    const openingCash = Number(cash.replace(/\D/g, '') || 0)
    const result = await openShift(session.outletId, session.id, openingCash)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onMutationDone()
  }, [cash, session, onMutationDone])

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(250)}
      style={styles.formCard}
    >
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Buka Shift</Text>
        <Text style={styles.formSubtitle}>Mulai shift kas baru untuk kasir ini.</Text>
      </View>

      <CashInput
        label="Kas awal (bisa 0)"
        value={cash}
        onChangeText={setCash}
        placeholder="0"
      />
      <Text style={styles.formHint}>
        Jumlah uang tunai di laci saat shift dimulai. Diisi 0 jika kosong.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.formActions}>
        <PrimaryButton label="Buka Shift" onPress={handleOpen} disabled={saving} loading={saving} />
      </View>
    </Animated.View>
  )
}

/** Rekap shift berjalan + form tutup (kas aktual → expected vs actual vs selisih). */
function RunningShiftCard({
  shift,
  summary,
  onMutationDone,
}: {
  shift: ShiftRow
  summary: { count: number; total: number; cashTotal: number; byPaymentMethod: { paymentMethodId: string; paymentMethodName: string; count: number; total: number }[] }
  onMutationDone: () => void
}) {
  const { session } = useSession()
  const [cash, setCash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const reducedMotion = useReducedMotion()

  // Live preview selisih: kas aktual input vs expected saat ini.
  const actualPreview = Number(cash.replace(/\D/g, '') || 0)
  const differencePreview = actualPreview - shift.expectedCash
  const diffColor =
    differencePreview === 0 ? COLORS.success : differencePreview > 0 ? COLORS.primary : COLORS.danger

  const handleClose = useCallback(async () => {
    if (!session) return
    setError(null)
    setSaving(true)
    const actual = Number(cash.replace(/\D/g, '') || 0)
    const result = await closeShift(shift.id, session.outletId, session.id, actual)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onMutationDone()
  }, [cash, session, shift.id, onMutationDone])

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(250)}
      style={styles.formCard}
    >
      <View style={styles.formHeader}>
        <View style={styles.runningHeaderRow}>
          <View style={styles.runningDot} />
          <Text style={styles.formTitle}>Shift Berjalan</Text>
        </View>
        <Text style={styles.formSubtitle}>Dibuka {formatDateTime(shift.openedAt)}</Text>
      </View>

      <Card>
        <StatRow label="Kas awal" value={formatIDR(shift.openingCash)} />
        <StatRow label="Total transaksi" value={`${formatNumber(summary.count)}x`} />
        <StatRow label="Omzet" value={formatIDR(summary.total)} strong />
      </Card>

      <Card title="Per Metode Bayar">
        <PaymentMethodBreakdown summary={summary} />
      </Card>

      <View style={styles.closeForm}>
        <Text style={styles.closeTitle}>Tutup Shift</Text>
        <CashInput
          label="Kas aktual di laci"
          value={cash}
          onChangeText={setCash}
          placeholder="0"
        />

        <View style={styles.diffBox}>
          <StatRow label="Kas ekspektasi" value={formatIDR(shift.expectedCash)} />
          <StatRow
            label="Kas aktual (pratinjau)"
            value={cash === '' ? '—' : formatIDR(actualPreview)}
          />
          <StatRow
            label="Selisih"
            value={cash === '' ? '—' : formatIDR(differencePreview)}
            accent={differencePreview === 0 ? 'success' : differencePreview > 0 ? undefined : 'danger'}
          />
          {cash !== '' && differencePreview !== 0 ? (
            <Text style={[styles.diffHint, { color: diffColor }]}>
              {differencePreview > 0
                ? `Lebih ${formatIDR(differencePreview)} dari ekspektasi`
                : `Kurang ${formatIDR(Math.abs(differencePreview))} dari ekspektasi`}
            </Text>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton
          label="Tutup Shift & Hitung Selisih"
          onPress={handleClose}
          disabled={saving}
          loading={saving}
        />
      </View>
    </Animated.View>
  )
}

/** Satu baris riwayat shift (list). */
function HistoryRow({
  item,
  index,
  onPress,
}: {
  item: { id: string; status: 'open' | 'closed'; openingCash: number; expectedCash: number; actualCash: number | null; difference: number | null; openedAt: number | Date; closedAt: number | Date | null; summary: { count: number; total: number } }
  index: number
  onPress: (id: string) => void
}) {
  const reducedMotion = useReducedMotion()
  const isOpen = item.status === 'open'
  const difference = item.difference ?? null

  return (
    <Animated.View
      entering={
        reducedMotion
          ? FadeIn.duration(150)
          : FadeInDown.duration(250).delay(Math.min(index, 8) * 40)
      }
      layout={Layout.duration(200)}
    >
      <Pressable
        onPress={() => onPress(item.id)}
        style={({ pressed }) => [styles.historyRow, pressed && styles.historyRowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Shift ${shiftStatusLabel(item.status)} ${formatDateTime(item.openedAt)}`}
      >
        <View style={styles.historyMain}>
          <View style={styles.historyTop}>
            <Text style={[styles.historyStatus, isOpen ? styles.historyStatusOpen : styles.historyStatusClosed]}>
              {shiftStatusLabel(item.status)}
            </Text>
            <Text style={styles.historyTime}>{formatDateTime(item.openedAt)}</Text>
          </View>
          <Text style={styles.historyMeta}>
            {item.summary.count} transaksi · omzet {formatIDR(item.summary.total)}
          </Text>
          {difference !== null ? (
            <Text
              style={[
                styles.historyDiff,
                difference === 0
                  ? styles.historyDiffZero
                  : difference > 0
                    ? styles.historyDiffPlus
                    : styles.historyDiffMinus,
              ]}
            >
              Selisih {formatIDR(difference)} {difference > 0 ? 'lebih' : difference < 0 ? 'kurang' : '(pas)'}
            </Text>
          ) : null}
        </View>
        <Text style={styles.historyChevron}>›</Text>
      </Pressable>
    </Animated.View>
  )
}

/** Riwayat shift — list dengan stagger entrance. */
function HistoryList({ onSelect }: { onSelect: (id: string) => void }) {
  const { session } = useSession()
  const { history, loading } = useShiftHistory(session?.outletId ?? '', session?.id)

  return (
    <View style={styles.historySection}>
      <Text style={styles.sectionTitle}>Riwayat Shift</Text>
      {loading ? (
        <Text style={styles.emptyHint}>Memuat riwayat…</Text>
      ) : history.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Belum ada shift"
          text="Buka shift pertama untuk mulai bertransaksi."
        />
      ) : (
        <View style={styles.historyList}>
          {history.map((h, i) => (
            <HistoryRow key={h.id} item={h} index={i} onPress={onSelect} />
          ))}
        </View>
      )}
    </View>
  )
}

export default function ShiftScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useSession()

  const { active, loading, reload } = useActiveShift(
    session?.outletId ?? '',
    session?.id ?? '',
  )

  const activeShift = active?.shift ?? null

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <HeaderBar
        title="Shift"
        subtitle={session?.outletName ?? 'Outlet'}
        right={<Text style={styles.footerNote}>Fase 2B.3 · Mock lokal</Text>}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.emptyHint}>Memuat shift…</Text>
        ) : activeShift?.status === 'open' ? (
          <RunningShiftCard
            shift={activeShift}
            summary={
              active?.summary ?? { count: 0, total: 0, cashTotal: 0, byPaymentMethod: [] }
            }
            onMutationDone={() => void reload()}
          />
        ) : (
          <OpenShiftForm onMutationDone={() => void reload()} />
        )}

        {active?.autoClosed ? (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(150)}
            style={styles.warningBox}
          >
            <Text style={styles.warningText}>{active.autoClosedNote}</Text>
          </Animated.View>
        ) : null}

        <HistoryList onSelect={() => {}} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  footerNote: { fontSize: 11, color: COLORS.textMuted },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  formHeader: { gap: 2 },
  runningHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runningDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  formTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  formSubtitle: { fontSize: 12, color: COLORS.textMuted },
  cashField: { gap: 6 },
  cashLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
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
  formActions: { marginTop: 4 },
  errorText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 8 },
  pmList: { gap: 8 },
  pmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pmName: { fontSize: 13, color: COLORS.textMuted, flexShrink: 1 },
  pmTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  closeForm: { gap: 12, marginTop: 4 },
  closeTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  diffBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  diffHint: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  warningBox: {
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: 12,
    padding: 12,
  },
  warningText: { fontSize: 13, fontWeight: '600', color: COLORS.warning },
  historySection: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyList: { gap: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  historyRowPressed: { backgroundColor: COLORS.bg },
  historyMain: { gap: 4, flex: 1 },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyStatus: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  historyStatusOpen: { backgroundColor: COLORS.successSoft, color: COLORS.successStrong },
  historyStatusClosed: { backgroundColor: COLORS.grayBadge, color: COLORS.grayBadgeText },
  historyTime: { fontSize: 12, color: COLORS.textMuted },
  historyMeta: { fontSize: 13, color: COLORS.text },
  historyDiff: { fontSize: 13, fontWeight: '700' },
  historyDiffZero: { color: COLORS.success },
  historyDiffPlus: { color: COLORS.primary },
  historyDiffMinus: { color: COLORS.danger },
  historyChevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: 8 },
})
