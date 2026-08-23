import React from 'react'
import { Text, View } from 'react-native'

/**
 * Badge soft — background lembut + teks solid (MASTER.md), radius full.
 * Dipakai status transaksi, stok, metode.
 */
export default function Badge({
  label,
  tone = 'neutral',
  className = '',
}: {
  label: string
  tone?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral'
  className?: string
}) {
  const tones = {
    primary: 'bg-primary-soft',
    success: 'bg-success-soft',
    danger: 'bg-danger-soft',
    warning: 'bg-warning-soft',
    neutral: 'bg-gray-badge',
  } as const
  const texts = {
    primary: 'text-primary-pressed',
    success: 'text-success-pressed',
    danger: 'text-danger-pressed',
    warning: 'text-warning',
    neutral: 'text-gray-badge-text',
  } as const
  return (
    <View className={`px-2 py-0.5 rounded-full ${tones[tone]} ${className}`}>
      <Text className={`text-[11px] font-bold leading-4 ${texts[tone]}`}>{label}</Text>
    </View>
  )
}