import { Platform, Share } from 'react-native'

/**
 * Share web-safe — Share API react-native-web tidak didukung penuh.
 * Urutan fallback di web: navigator.share (native share sheet) →
 * copy ke clipboard → laporkan gagal diam-diam. Native: Share.share biasa.
 */

export async function shareText(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator
    try {
      if (typeof nav.share === 'function') {
        await nav.share({ title, text: message })
        return true
      }
    } catch {
      // user cancel / tidak didukung — lanjut ke clipboard
    }
    try {
      if (typeof nav.clipboard?.writeText === 'function') {
        await nav.clipboard.writeText(message)
        return true
      }
    } catch {
      // ignore
    }
    return false
  }

  try {
    await Share.share({ title, message })
    return true
  } catch {
    return false
  }
}