import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import { ReceiptView } from './ReceiptView'
import { buildPrintableText } from '../../print/print-service'
import { usePrinter } from '../../print/use-printer'
import { shareText } from '../../lib/share'
import { formatIDR } from '../../lib/format'
import type { QueuedTransactionPayload } from '../../db/queue'
import { COLORS } from '../../theme'

type PrintFeedback = 'idle' | 'success' | 'error'

/**
 * Receipt sheet — preview struk 58mm setelah bayar sukses.
 * Cetak (mock BLE) / Bagikan (Share fallback) — transaksi TIDAK pernah
 * diblokir oleh printer. Status printer kompak (dot + label) + tombol
 * hubungkan inline, detail penuh di tab Sync.
 */
export default function ReceiptSheet({
  visible,
  transaction,
  onClose,
}: {
  visible: boolean
  transaction: QueuedTransactionPayload | null
  onClose: () => void
}) {
  const { connected, printerName, printing, print, connect } = usePrinter()

  const [feedback, setFeedback] = useState<PrintFeedback>('idle')
  const [printError, setPrintError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (visible) {
      setFeedback('idle')
      setPrintError(null)
    }
  }, [visible, transaction?.offlineId])

  useEffect(() => {
    if (feedback !== 'success') return
    resetTimer.current = setTimeout(() => setFeedback('idle'), 2500)
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [feedback])

  const handlePrint = useCallback(async () => {
    if (!transaction || printing) return
    const result = await print(buildPrintableText(transaction))
    if (result.ok) {
      setFeedback('success')
      setPrintError(null)
    } else {
      setFeedback('error')
      setPrintError(result.error ?? 'Gagal mencetak struk')
    }
  }, [transaction, printing, print])

  const handleShare = useCallback(async () => {
    if (!transaction) return
    await shareText(
      `Struk ${transaction.offlineId.slice(0, 8).toUpperCase()}`,
      buildPrintableText(transaction),
    )
  }, [transaction])

  const handleConnect = useCallback(() => {
    if (connecting || connected) return
    setConnecting(true)
    void connect().finally(() => setConnecting(false))
  }, [connecting, connected, connect])

  if (!visible || !transaction) return null
  const itemCount = transaction.items.reduce((s, i) => s + i.qty, 0)

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Transaksi Berhasil"
      subtitle={`${formatIDR(transaction.total)} · ${itemCount} item`}
      maxHeight="90%"
      footer={
        <View className="gap-3">
          {feedback === 'success' ? (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(120)}
              className="flex-row items-center gap-2 rounded-xl bg-success-soft border border-success-border px-3.5 py-3"
            >
              <Icon name="check" size={16} color="#16A34A" />
              <Text className="flex-1 text-[13px] font-bold text-success-pressed">Struk terkirim ke printer</Text>
            </Animated.View>
          ) : null}
          {feedback === 'error' ? (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(120)}
              className="flex-row items-center gap-2 rounded-xl bg-danger-soft border border-danger-border px-3.5 py-3"
            >
              <Icon name="warning" size={16} color="#DC2626" />
              <Text className="flex-1 text-[13px] font-bold text-danger-pressed">{printError}</Text>
            </Animated.View>
          ) : null}

          <Button
            label={printing ? 'Mencetak…' : 'Cetak Struk'}
            onPress={() => void handlePrint()}
            disabled={printing}
            loading={printing}
            accessibilityLabel="Cetak struk"
          />
          <View className="flex-row gap-3">
            <Button
              label="Bagikan Struk"
              variant="outline"
              size="md"
              className="flex-1"
              icon={<Icon name="share" size={16} color={COLORS.text} />}
              onPress={() => void handleShare()}
            />
            <Button label="Selesai" variant="ghost" size="md" className="flex-1" onPress={onClose} />
          </View>
        </View>
      }
    >
      <View className="px-4 pb-3 gap-3">
        <ScrollView className="max-h-[340px]" bounces={false} showsVerticalScrollIndicator>
          <ReceiptView transaction={transaction} />
        </ScrollView>

        <View className="flex-row justify-between items-baseline px-1">
          <Text className="text-[14px] font-bold text-text-muted">TOTAL ({itemCount} item)</Text>
          <Text className="text-[20px] font-extrabold text-text tabular-nums">{formatIDR(transaction.total)}</Text>
        </View>

        <View className="flex-row items-center justify-between rounded-xl bg-bg border border-border px-3.5 py-3">
          <View className="flex-row items-center gap-2">
            <View className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-offline-dot'}`} />
            <Text className={`text-[12px] font-semibold ${connected ? 'text-success-pressed' : 'text-warning'}`}>
              {connected ? printerName ?? 'Printer' : 'Printer belum terhubung'}
            </Text>
          </View>
          {!connected ? (
            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              accessibilityRole="button"
              accessibilityLabel={connecting ? 'Menghubungkan printer' : 'Coba hubungkan printer'}
              accessibilityState={{ disabled: connecting }}
              className="px-3 min-h-12 rounded-lg bg-warning-soft border border-warning-border items-center justify-center active:opacity-80"
            >
              <Text className="text-[12px] font-bold text-warning">
                {connecting ? 'Menghubungkan…' : 'Hubungkan'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Sheet>
  )
}