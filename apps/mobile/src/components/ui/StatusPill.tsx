import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { useSync } from '../../sync/sync-context'
import { usePrinter } from '../../print/use-printer'

/**
 * Status koneksi + printer — KOMPAK: dot 8px + label singkat di header.
 * Bukan chip besar; detail lengkap ada di tab Sync. Tap → buka Sync.
 */
export default function StatusPill() {
  const router = useRouter()
  const { isOnline, pendingCount } = useSync()
  const { connected, printerName } = usePrinter()

  const netLabel = isOnline ? 'Online' : 'Offline'
  const netDot = isOnline ? 'bg-success' : 'bg-offline-dot'
  const netText = isOnline ? 'text-success-pressed' : 'text-warning'

  const printDot = connected ? 'bg-success' : 'bg-offline-dot'
  const printText = connected ? 'text-success-pressed' : 'text-warning'

  const openSync = () => router.push('/sync')

  return (
    <Pressable
      onPress={openSync}
      accessibilityRole="button"
      accessibilityLabel={
        isOnline
          ? pendingCount > 0
            ? `Online, ${pendingCount} transaksi menunggu sinkron. Printer ${connected ? 'terhubung' : 'terputus'}. Buka layar sinkron.`
            : `Online. Printer ${connected ? 'terhubung' : 'terputus'}. Buka layar sinkron.`
          : 'Offline. Buka layar sinkron.'
      }
      className="flex-row items-center gap-3 px-2 py-2 rounded-xl active:bg-surfaceMuted"
      hitSlop={4}
    >
      <View className="flex-row items-center gap-1.5">
        <View className={`w-2 h-2 rounded-full ${netDot}`} />
        <Text className={`text-[11px] font-semibold ${netText}`}>{netLabel}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <View className={`w-2 h-2 rounded-full ${printDot}`} />
        <Text className={`text-[11px] font-semibold ${printText}`}>
          {connected ? printerName?.split(' ')[0] ?? 'Printer' : 'Printer'}
        </Text>
      </View>
    </Pressable>
  )
}