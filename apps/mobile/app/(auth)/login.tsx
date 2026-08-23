import { cashierLoginSchema } from '@larispos/shared'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Icon from '../../src/components/Icon'
import { MOCK_OUTLETS, findCashierByPin, useSession, type OutletInfo } from '../../src/auth/session'
import {
  clearPinLock,
  loadPinLock,
  savePinLock,
  MAX_PIN_ATTEMPTS,
  PIN_LOCK_DURATION_MS,
} from '../../src/auth/pin-lock'

const PIN_LENGTH = 6

const NUM_KEYS: (string | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'del']

function formatLockTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signIn } = useSession()

  const reducedMotion = useReducedMotion()

  const [outlet, setOutlet] = useState<OutletInfo>(MOCK_OUTLETS[0])
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [lockHydrated, setLockHydrated] = useState(false)

  // Hydrate lock state dari SecureStore (restart tidak me-reset lock) — PRD §13.
  useEffect(() => {
    let mounted = true
    void loadPinLock().then((state) => {
      if (!mounted) return
      const lockStillActive = state.lockedUntil !== null && state.lockedUntil > Date.now()
      if (lockStillActive) {
        setLockedUntil(state.lockedUntil)
        setAttempts(state.failedAttempts)
        setNow(Date.now())
      } else {
        setAttempts(0)
        setLockedUntil(null)
        if (state.lockedUntil !== null || state.failedAttempts > 0) {
          void clearPinLock()
        }
      }
      setLockHydrated(true)
    })
    return () => {
      mounted = false
    }
  }, [])

  const shakeX = useSharedValue(0)
  const errorShake = useRef(false)

  useEffect(() => {
    if (lockedUntil === null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [lockedUntil])

  useEffect(() => {
    if (lockedUntil !== null && now >= lockedUntil) {
      setLockedUntil(null)
      setAttempts(0)
      void clearPinLock()
    }
  }, [now, lockedUntil])

  const isLocked = lockedUntil !== null && now < lockedUntil
  const remainingMs = isLocked && lockedUntil !== null ? lockedUntil - now : 0

  const onPressKey = useCallback(
    (key: string) => {
      if (isLocked) return
      setError(null)
      setPin((prev) => {
        if (key === 'del') return prev.slice(0, -1)
        if (prev.length >= PIN_LENGTH) return prev
        return prev + key
      })
    },
    [isLocked],
  )

  const runErrorShake = useCallback(() => {
    if (errorShake.current || reducedMotion) return
    errorShake.current = true
    shakeX.value = withSequence(
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }, () => {
        errorShake.current = false
      }),
    )
  }, [reducedMotion, shakeX])

  // AUTO-SUBMIT saat 6 digit terisi — login < 3 detik, tanpa tombol Submit.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return
    if (isLocked) return

    const parsed = cashierLoginSchema.safeParse({ outletId: outlet.id, pin })
    if (!parsed.success) {
      setError('PIN harus 6 digit angka')
      runErrorShake()
      setPin('')
      return
    }

    const staff = findCashierByPin(outlet.id, pin)
    if (!staff) {
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      if (nextAttempts >= MAX_PIN_ATTEMPTS) {
        const until = Date.now() + PIN_LOCK_DURATION_MS
        setLockedUntil(until)
        setError(`PIN salah ${MAX_PIN_ATTEMPTS}x. Kasir dikunci 5 menit.`)
        void savePinLock({ failedAttempts: nextAttempts, lockedUntil: until })
      } else {
        setError(`PIN salah. Sisa percobaan ${MAX_PIN_ATTEMPTS - nextAttempts}x`)
        void savePinLock({ failedAttempts: nextAttempts, lockedUntil: null })
      }
      runErrorShake()
      setPin('')
      return
    }

    void clearPinLock().then(() =>
      signIn({
        id: staff.id,
        name: staff.name,
        role: 'cashier',
        outletId: outlet.id,
        outletName: outlet.name,
      }).then(() => {
        router.replace('/(app)/pos')
      }),
    )
  }, [pin, outlet, attempts, isLocked, signIn, runErrorShake, router])

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length)

  if (!lockHydrated) return null

  return (
    <View
      className="flex-1 bg-bg px-6"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(250)} className="items-center mt-5 mb-4">
        <Text className="text-[13px] font-bold tracking-[2px] text-primary uppercase mb-3">LarisPOS</Text>
        <Text className="text-2xl font-extrabold text-text tracking-[-0.02em]">Masuk Kasir</Text>
        <Text className="text-[14px] text-text-muted mt-1">Masukkan PIN 6 digit untuk mulai melayani</Text>
      </Animated.View>

      {/* Pilih outlet (compact) */}
      <Animated.View
        key={outlet.id}
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(150)}
        className="rounded-2xl border border-border bg-surface p-4"
      >
        <Text className="text-[12px] font-bold text-text-muted uppercase tracking-wide mb-2">
          Outlet aktif
        </Text>
        <View className="flex-row gap-2 flex-wrap">
          {MOCK_OUTLETS.map((o) => {
            const active = o.id === outlet.id
            return (
              <Pressable
                key={o.id}
                disabled={isLocked}
                onPress={() => {
                  setOutlet(o)
                  setPin('')
                  setError(null)
                  setAttempts(0)
                  void clearPinLock()
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`min-h-12 justify-center px-3.5 rounded-full border ${
                  active ? 'bg-primary border-primary' : 'bg-surfaceMuted border-border active:bg-surfaceMuted'
                }`}
              >
                <Text className={`text-[13px] font-semibold ${active ? 'text-on-primary' : 'text-text'}`}>
                  {o.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text className="text-[12px] text-text-muted mt-2">{outlet.address}</Text>
      </Animated.View>

      {/* PIN dots + error */}
      <Animated.View style={[shakeStyle]} className="items-center mt-6 mb-2">
        <View
          className="flex-row gap-3.5 h-[18px] items-center"
          accessibilityLabel={`PIN ${pin.length} dari ${PIN_LENGTH} digit dimasukkan`}
          accessibilityValue={{ min: 0, max: PIN_LENGTH, now: pin.length, text: `${pin.length} digit` }}
        >
          {dots.map((filled, i) => (
            <View
              key={i}
              className={`w-3.5 h-3.5 rounded-full ${filled ? 'bg-primary' : 'bg-surfacePressed'}`}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ))}
        </View>
        <Animated.View
          key={error ?? 'ok'}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          className="min-h-[34px] justify-center mt-2"
        >
          {error ? <Text className="text-[13px] font-semibold text-danger text-center">{error}</Text> : null}
        </Animated.View>
      </Animated.View>

      {/* Numpad — thumb zone (1/3 bawah layar) */}
      {isLocked ? (
        <Animated.View
          entering={FadeIn.duration(250)}
          className="items-center rounded-2xl border border-danger-border bg-surface p-5 mt-2"
          accessibilityRole="alert"
          accessibilityLabel={`Terlalu banyak percobaan. Kasir dikunci ${formatLockTime(remainingMs)}`}
        >
          <Text className="text-[16px] font-bold text-text">Terlalu banyak percobaan</Text>
          <Text className="text-[40px] font-extrabold text-danger tabular-nums mt-1.5">
            {formatLockTime(remainingMs)}
          </Text>
          <Text className="text-[13px] text-text-muted mt-1 text-center">
            Coba lagi setelah waktu ini habis.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(250)} className="flex-row flex-wrap max-w-[348px] self-center mt-2 justify-center">
          {NUM_KEYS.map((key, i) => {
            if (key === null) {
              return <View key={`blank-${i}`} className="w-[104px] h-[64px] m-[6px]" />
            }
            const isDel = key === 'del'
            return (
              <Pressable
                key={key}
                onPress={() => onPressKey(key)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                accessibilityRole="button"
                accessibilityLabel={isDel ? 'Hapus digit' : `Digit ${key}`}
                className="w-[104px] h-16 m-[6px] rounded-xl border border-border bg-surface items-center justify-center active:bg-primary-soft"
              >
                {isDel ? (
                  <Icon name="backspace" size={26} color="#64748B" />
                ) : (
                  <Text className="text-2xl font-bold text-text">{key}</Text>
                )}
              </Pressable>
            )
          })}
        </Animated.View>
      )}
    </View>
  )
}