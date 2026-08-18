import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useSession } from '../../src/auth/session'
import { SyncProvider } from '../../src/sync/sync-context'

export default function AppLayout() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <SyncProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="pos" />
        <Stack.Screen name="shift" />
        <Stack.Screen name="history" />
        <Stack.Screen name="sync" />
      </Stack>
    </SyncProvider>
  )
}
