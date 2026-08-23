import React from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

/**
 * Tombol kasir — ukuran thumb-zone: md = 48px (h-12), lg = 56px (h-14).
 * Variant: primary (biru — aksi utama: Bayar/Buka Shift/Tutup Shift),
 * outline, ghost, danger (hanya aksi destruktif: void/hapus/kosongkan).
 * Semua state pressed punya feedback instan; disabled + loading eksplisit.
 */
export default function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'lg',
  icon,
  className = '',
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'md' | 'lg'
  icon?: React.ReactNode
  className?: string
  accessibilityLabel?: string
}) {
  const blocked = disabled || loading

  const base =
    'flex-row items-center justify-center rounded-xl active:opacity-85'
  const sizeClass = size === 'lg' ? 'h-14 px-6' : 'h-12 px-4'
  const variants = {
    primary: 'bg-primary active:bg-primary-pressed',
    danger: 'bg-danger active:bg-danger-pressed',
    outline: 'bg-surface border border-border active:bg-surfaceMuted',
    ghost: 'bg-transparent active:bg-surfaceMuted',
  } as const
  const textColor = {
    primary: 'text-on-primary',
    danger: 'text-on-primary',
    outline: 'text-text',
    ghost: 'text-text-muted',
  } as const
  const spinnerColor = {
    primary: '#FFFFFF',
    danger: '#FFFFFF',
    outline: '#0F172A',
    ghost: '#64748B',
  } as const
  const weight = variant === 'outline' || variant === 'ghost' ? 'font-bold' : 'font-extrabold'

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      className={`${base} ${sizeClass} ${variants[variant]} ${blocked ? 'opacity-40' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor[variant]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? icon : null}
          <Text className={`${textColor[variant]} ${weight} ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  )
}