import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

/**
 * Haptics web-safe — expo-haptics tidak punya implementasi web; memanggil
 * native module yang hilang akan THROW (bukan cuma reject). Guard Platform
 * + try/catch biar aman di expo web tanpa mengubah kode pemanggil.
 */

const isWeb = Platform.OS === 'web'

function safeCall(fn: () => Promise<unknown>): void {
  if (isWeb) return
  try {
    void fn().catch(() => {})
  } catch {
    // native module tidak tersedia — abaikan
  }
}

/** Feedback ringan — item ditambah ke keranjang. */
export function hapticLight(): void {
  safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

/** Feedback sedang — quick-add (long-press). */
export function hapticMedium(): void {
  safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
}

/** Feedback sukses — pembayaran berhasil. */
export function hapticSuccess(): void {
  safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}