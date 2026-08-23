import React from 'react'
import { Text, View } from 'react-native'

import Icon from './Icon'

/**
 * Empty state RINGKAS & branded — circle primary-soft + icon primary
 * (bukan abu-abu generik), judul + 1 baris + CTA opsional.
 * Maks ~40% tinggi layar visible: jangan dominan.
 */
export default function EmptyState({
  icon = 'inbox',
  title,
  text,
  action,
}: {
  icon?: string
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <View className="items-center justify-center px-6 py-8" accessibilityRole="summary">
      <View
        className="w-12 h-12 rounded-full bg-primary-soft items-center justify-center mb-2"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name={icon} size={26} color="#2563EB" />
      </View>
      <Text className="text-[14px] font-bold text-text text-center">{title}</Text>
      <Text className="text-[13px] text-text-muted text-center leading-5 mt-0.5">{text}</Text>
      {action ? <View className="mt-3">{action}</View> : null}
    </View>
  )
}