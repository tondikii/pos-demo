import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useSession } from '../../src/auth/session'
import { SyncProvider } from '../../src/sync/sync-context'
import BottomNav from '../../src/components/BottomNav'

export default function AppLayout() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <SyncProvider>
      {/* Bottom nav bersama (PRD Flow 3) — semua screen (app) punya 4 tab. */}
      <View className="flex-1 bg-bg">
        <View className="flex-1">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="pos" />
            <Stack.Screen name="shift" />
            <Stack.Screen name="history" />
            <Stack.Screen name="sync" />
          </Stack>
        </View>
        <BottomNav />
      </View>
    </SyncProvider>
  )
}