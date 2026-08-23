import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { LogBox, Platform, StatusBar, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { SessionProvider } from '../src/auth/session'
import { seedMockData } from '../src/db/mock-seed'

import '../global.css'

// Dev only: redam warning internal RN (mis. parsing-log LogBox) yang tidak
// terkait app — tidak berpengaruh di production (LogBox dev-only).
if (__DEV__) {
  LogBox.ignoreLogs(['Parsing logs are expensive'])
}

// react-native-web: Appearance head-observer melempar error saat darkMode
// 'media' (default). Set 'class' supaya tidak throw di expo web.
if (Platform.OS === 'web') {
  try {
    ;(StyleSheet as unknown as { setFlag?: (key: string, value: string) => void }).setFlag?.(
      'darkMode',
      'class',
    )
  } catch {
    // non-fatal — flag tidak tersedia di versi ini
  }
}

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync()
  }, [fontsLoaded])

  // Dev only: seed mock data untuk review state (riwayat/shift/antrean).
  // WAJIB di dalam komponen (aturan hooks) — bukan module scope.
  useEffect(() => {
    if (__DEV__) void seedMockData()
  }, [])

  if (!fontsLoaded) return null

  return (
<SessionProvider>
          <SafeAreaProvider>
            {Platform.OS !== 'web' ? (
              <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            ) : null}
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaProvider>
        </SessionProvider>
  )
}