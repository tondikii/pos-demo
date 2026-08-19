import { cashierLoginSchema } from '@larispos/shared'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
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

import {
  MOCK_OUTLETS,
  findCashierByPin,
  useSession,
  type OutletInfo,
} from '../../src/auth/session'
import {
  clearPinLock,
  loadPinLock,
  savePinLock,
  MAX_PIN_ATTEMPTS,
  PIN_LOCK_DURATION_MS,
} from '../../src/auth/pin-lock'
import { COLORS } from '../../src/theme'

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
        // Lock masih aktif → counter tetap (tidak di-reset), tampilkan countdown.
        setLockedUntil(state.lockedUntil)
        setAttempts(state.failedAttempts)
        setNow(Date.now())
      } else {
        // Lock habis / tidak pernah → mulai dari nol.
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

  // Countdown lock — interval 250ms agar "04:59" tidak melompat.
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

  // AUTO-SUBMIT saat 6 digit terisi — PRD: login < 3 detik, tanpa tombol Submit.
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

    // Sukses — simpan session ke SecureStore (mock token) lalu masuk ke kasir.
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

  // Tunggu hydrate lock state dari SecureStore sebelum render interaktif
  // (mencegah numpad aktif sejenak saat restart dalam masa lock).
  if (!lockHydrated) return null

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View entering={FadeIn.duration(250)} style={styles.header}>
        <Text style={styles.logo}>LarisPOS</Text>
        <Text style={styles.title}>Masuk Kasir</Text>
        <Text style={styles.subtitle}>Masukkan PIN 6 digit untuk mulai melayani</Text>
      </Animated.View>

      <Animated.View
        key={outlet.id}
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(150)}
        style={styles.outletCard}
      >
        <Text style={styles.outletLabel}>Outlet aktif</Text>
        <View style={styles.outletChips}>
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
                style={[styles.outletChip, active && styles.outletChipActive]}
              >
                <Text style={[styles.outletChipText, active && styles.outletChipTextActive]}>
                  {o.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text style={styles.outletAddress}>{outlet.address}</Text>
      </Animated.View>

      <Animated.View style={[styles.pinArea, shakeStyle]}>
        <View
          style={styles.dotsRow}
          accessibilityLabel={`PIN ${pin.length} dari ${PIN_LENGTH} digit dimasukkan`}
          accessibilityValue={{ min: 0, max: PIN_LENGTH, now: pin.length, text: `${pin.length} digit` }}
        >
          {dots.map((filled, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                filled ? styles.dotFilled : styles.dotEmpty,
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ))}
        </View>

        <Animated.View
          key={error ?? 'ok'}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.errorSlot}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Animated.View>
      </Animated.View>

      {isLocked ? (
        <Animated.View
          entering={FadeIn.duration(250)}
          style={styles.lockCard}
          accessibilityRole="alert"
          accessibilityLabel={`Terlalu banyak percobaan. Kasir dikunci ${formatLockTime(remainingMs)}`}
        >
          <Text style={styles.lockTitle}>Terlalu banyak percobaan</Text>
          <Text style={styles.lockCountdown}>{formatLockTime(remainingMs)}</Text>
          <Text style={styles.lockHint}>Coba lagi setelah waktu ini habis.</Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(250)} style={styles.numpad}>
          {NUM_KEYS.map((key, i) => {
            if (key === null) {
              return <View key={`blank-${i}`} style={styles.key} />
            }
            const isDel = key === 'del'
            return (
              <Pressable
                key={key}
                onPress={() => onPressKey(key)}
                style={({ pressed }) => [
                  styles.key,
                  pressed && styles.keyPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isDel ? 'Hapus digit' : `Digit ${key}`}
              >
                <Text style={[styles.keyText, isDel && styles.keyTextDel]}>
                  {isDel ? '⌫' : key}
                </Text>
              </Pressable>
            )
          })}
        </Animated.View>
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  logo: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  outletCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  outletLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outletChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  outletChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outletChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  outletChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  outletChipTextActive: {
    color: '#FFFFFF',
  },
  outletAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  pinArea: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    height: 18,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotEmpty: {
    backgroundColor: COLORS.dotEmpty,
  },
  dotFilled: {
    backgroundColor: COLORS.dotFilled,
  },
  errorSlot: {
    minHeight: 34,
    justifyContent: 'center',
    marginTop: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  lockCountdown: {
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: COLORS.error,
    marginTop: 6,
  },
  lockHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 360,
    alignSelf: 'center',
    marginTop: 8,
  },
  key: {
    width: 96,
    height: 64,
    margin: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keyPressed: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  keyTextDel: {
    fontSize: 22,
    color: COLORS.textMuted,
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
  },
})
