import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useSession } from '../../src/auth/session'
import { SyncProvider } from '../../src/sync/sync-context'
import BottomNav from '../../src/components/BottomNav'
import { COLORS } from '../../src/theme'

export default function AppLayout() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <SyncProvider>
      {/* Bottom nav bersama (PRD Flow 3) — semua screen (app) punya 4 tab. */}
      <View style={styles.root}>
        <View style={styles.screen}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
})
