import React, { memo } from 'react'
import { Text, View } from 'react-native'

import { useSession } from '../../auth/session'
import { formatDateTime, formatIDR, formatNumber } from '../../lib/format'
import { MOCK_OUTLET_CONFIG, MOCK_PAYMENT_METHODS } from '../../lib/mock-data'
import type { QueuedTransactionPayload } from '../../db/queue'

function Divider() {
  return <View className="h-px bg-border my-3" />
}

function LabelValue({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row justify-between items-baseline py-[3px]">
      <Text className={`text-[12px] ${strong ? 'font-extrabold text-text' : 'text-text-muted'}`}>{label}</Text>
      <Text className={`text-[12px] tabular-nums ${strong ? 'font-extrabold text-text' : 'font-bold text-text'}`}>
        {value}
      </Text>
    </View>
  )
}

/**
 * Preview struk 58mm — VERSI LAYAR: komponen UI modern (divider halus,
 * tabular-nums, hierarki teks), BUKAN teks ASCII mentah. Format ASCII asli
 * (buildPrintableText) tetap dipakai HANYA untuk kirim ke printer thermal.
 * memo: render ulang hanya saat transaksi berubah.
 */
export const ReceiptView = memo(function ReceiptView({
  transaction,
}: {
  transaction: QueuedTransactionPayload
}) {
  const { session } = useSession()
  const paymentName =
    MOCK_PAYMENT_METHODS.find((m) => m.id === transaction.paymentMethodId)?.name ?? 'Metode lain'
  const itemCount = transaction.items.reduce((s, i) => s + i.qty, 0)

  return (
    <View className="bg-surface rounded-2xl border border-border px-4 py-4 gap-0.5">
      {/* Header outlet */}
      <Text className="text-[14px] font-extrabold text-text text-center leading-5">
        {MOCK_OUTLET_CONFIG.name}
      </Text>
      <Text className="text-[11px] text-text-muted text-center">{MOCK_OUTLET_CONFIG.address}</Text>
      <Divider />

      {/* Meta transaksi */}
      <LabelValue label="Tanggal" value={formatDateTime(transaction.createdAt)} />
      <LabelValue label="Kasir" value={session?.name ?? 'Kasir'} />
      <LabelValue label="Metode" value={paymentName} />
      <Divider />

      {/* Item */}
      {transaction.items.map((i, idx) => (
        <View key={`${i.productVariantId}-${idx}`} className="flex-row justify-between items-baseline py-[3px]">
          <View className="flex-1 pr-2">
            <Text className="text-[13px] font-bold text-text leading-5">{i.productName}</Text>
            <Text className="text-[11px] text-text-muted">
              {i.variantName} × {formatNumber(i.qty)}
            </Text>
            {i.note ? (
              <Text className="text-[11px] italic text-text-muted mt-0.5" numberOfLines={1}>
                Catatan: {i.note}
              </Text>
            ) : null}
          </View>
          <Text className="text-[13px] font-extrabold text-text tabular-nums">
            {formatIDR(i.lineTotal)}
          </Text>
        </View>
      ))}
      <Divider />

      {/* Ringkasan */}
      <LabelValue label="Subtotal" value={formatIDR(transaction.subtotal)} />
      {transaction.taxAmount > 0 ? (
        <LabelValue label="PPN 11%" value={formatIDR(transaction.taxAmount)} />
      ) : null}
      {transaction.serviceAmount > 0 ? (
        <LabelValue label="Layanan" value={formatIDR(transaction.serviceAmount)} />
      ) : null}
      <View className="flex-row justify-between items-baseline mt-1 pt-2 border-t border-border">
        <Text className="text-[15px] font-extrabold text-text">
          Total ({formatNumber(itemCount)} item)
        </Text>
        <Text className="text-[17px] font-extrabold text-text tabular-nums">{formatIDR(transaction.total)}</Text>
      </View>

      {/* Cash */}
      {typeof transaction.cashReceived === 'number' ? (
        <>
          <LabelValue label="Uang diterima" value={formatIDR(transaction.cashReceived)} />
          <LabelValue
            label="Kembalian"
            value={formatIDR(transaction.change ?? 0)}
            strong
          />
        </>
      ) : null}

      <Divider />
      <Text className="text-[11px] text-text-muted text-center leading-4">
        {MOCK_OUTLET_CONFIG.receiptFooter}
      </Text>
    </View>
  )
})