import React from 'react'
import { Text, View } from 'react-native'

/**
 * Header layar (app) — avatar outlet + judul menu 16 extrabold + subtitle
 * (outlet · profil kasir) 12 muted, aksi kanan opsional (StatusPill / logout).
 * Seragam di semua screen: avatar initial, padding 16/8, border bawah.
 */
export default function HeaderBar({
  title,
  outlet,
  profile,
  avatarLabel,
  right,
}: {
  title: string
  outlet?: string
  profile?: string
  avatarLabel?: string
  right?: React.ReactNode
}) {
  const subtitle = [outlet, profile].filter(Boolean).join(' · ')
  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-2 border-b border-border bg-surface">
      <View className="flex-1 flex-row items-center gap-2.5 pr-2 min-w-0">
        {avatarLabel ? (
          <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center">
            <Text className="text-[14px] font-extrabold text-primary">
              {avatarLabel.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        ) : null}
        <View className="flex-1 min-w-0">
          <Text className="text-[16px] font-extrabold text-text tracking-[-0.01em]" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[12px] text-text-muted mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  )
}