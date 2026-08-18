import { Stack } from 'expo-router'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { SessionProvider } from '../src/auth/session'

export default function RootLayout() {
  return (
    <SessionProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </SessionProvider>
  )
}
