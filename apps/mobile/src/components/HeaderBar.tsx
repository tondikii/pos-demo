import React from 'react'
import { Text, View } from 'react-native'

/**
 * Header layar (app) — judul 800 + subtitle outlet, aksi kanan opsional
 * (StatusPill kompak / tombol kontekstual). Seragam di semua screen:
 * judul 18 extrabold, subtitle 12 muted, padding 16/8, border bawah.
 */
export default function HeaderBar({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-2 border-b border-border bg-surface">
      <View className="flex-1 pr-2">
        <Text className="text-[18px] font-extrabold text-text tracking-[-0.02em]" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[12px] text-text-muted mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  )
}