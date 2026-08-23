import React, { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View, type DimensionValue } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Icon from '../Icon'

const EXIT_MS = 240

/**
 * Bottom sheet native kasir (bukan panel samping) — semua overlay utama
 * (keranjang, varian, struk, detail) memakai komponen ini.
 * - Transform/opacity only (SlideInDown/Up), reduced-motion → fade saja.
 * - Scrim tap = tutup. Handle dekoratif (tanpa drag — satu gesture per region).
 * - Footer opsional menempel di bawah konten (thumb zone).
 */
export default function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  right,
  children,
  footer,
  maxHeight = '86%',
  height,
}: {
  visible: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxHeight?: string | number
  /** Tinggi tetap sheet (untuk konten scrollable seperti cart) — wajib agar FlatList flex-1 tidak kolaps. */
  height?: string | number
}) {
  const insets = useSafeAreaInsets()
  const reducedMotion = useReducedMotion()
  const [show, setShow] = useState(false) // Modal.visible
  const [render, setRender] = useState(false) // konten (animasi keluar)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (visible) {
      setShow(true)
      setRender(true)
    } else {
      // Parent menutup langsung (bukan lewat scrim) — tutup dengan animasi keluar.
      setRender(false)
      closeTimer.current = setTimeout(() => {
        setShow(false)
      }, reducedMotion ? 130 : EXIT_MS)
    }
  }, [visible])

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const handleClose = useCallback(() => {
    setRender(false)
    closeTimer.current = setTimeout(() => {
      setShow(false)
      onClose()
    }, reducedMotion ? 130 : EXIT_MS)
  }, [onClose, reducedMotion])

  if (!show) return null

  const enter = reducedMotion ? FadeIn.duration(150) : SlideInDown.duration(280)
  const exit = reducedMotion ? FadeOut.duration(120) : SlideOutDown.duration(220)

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View className="flex-1 justify-end" style={Platform.OS === 'web' ? ({ height: '100vh' } as const) : undefined}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="absolute inset-0 bg-overlay"
          style={Platform.OS === 'web' ? ({ backgroundColor: 'rgba(15, 23, 42, 0.5)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const) : undefined}
        >
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup"
            className="flex-1"
          />
        </Animated.View>

        {render ? (
          <Animated.View
            entering={enter}
            exiting={exit}
            className="bg-surface rounded-t-3xl overflow-hidden"
            style={{
              height: (height ?? undefined) as DimensionValue | undefined,
              maxHeight: maxHeight as DimensionValue,
              paddingBottom: Platform.OS === 'web' ? Math.max(insets.bottom, 12) : Math.max(insets.bottom, 12),
              backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : undefined,
              ...(Platform.OS === 'web' ? ({ borderTopLeftRadius: 24, borderTopRightRadius: 24 } as const) : null),
            }}
          >
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-surfacePressed" />
            </View>

            {title ? (
              <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-[17px] font-extrabold text-text tracking-[-0.02em]" numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text className="text-xs text-text-muted mt-0.5" numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                {right ?? (
                  <Pressable
                    onPress={handleClose}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Tutup"
                    className="w-11 h-11 items-center justify-center rounded-xl active:bg-surfaceMuted"
                  >
                    <Icon name="close" size={20} color="#64748B" />
                  </Pressable>
                )}
              </View>
            ) : null}

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className={height !== undefined ? 'flex-1' : 'flex-shrink'}
            >
              {children}
            </KeyboardAvoidingView>

            {footer ? (
              <View className="px-4 pt-3 pb-2 border-t border-border bg-surface">{footer}</View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  )
}