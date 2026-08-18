import * as SecureStore from 'expo-secure-store'

/**
 * Lock PIN kasir (PRD §13): PIN salah 5x → kunci login 5 menit.
 * State di-persist ke SecureStore supaya RESTART tidak me-reset lock —
 * counter percobaan & waktu lock tersimpan sampai lock habis / login sukses.
 *
 * Aturan yang di-mirror:
 * - `failedAttempts` naik tiap PIN salah; >= 5 → `lockedUntil = now + 5 menit`.
 * - Saat lock aktif, counter di-reset 0 (setelah lock habis, hitungan mulai
 *   dari nol lagi — PRD: "setelah lock habis reset counter").
 * - Login sukses / pindah outlet → hapus lock state.
 */

export const MAX_PIN_ATTEMPTS = 5
export const PIN_LOCK_DURATION_MS = 5 * 60 * 1000 // 5 menit

const PIN_LOCK_KEY = 'larispos.pinLock'

export type PinLockState = {
  failedAttempts: number
  /** epoch ms kapan lock berakhir; null jika tidak sedang lock. */
  lockedUntil: number | null
}

export async function loadPinLock(): Promise<PinLockState> {
  try {
    const raw = await SecureStore.getItemAsync(PIN_LOCK_KEY)
    if (!raw) return { failedAttempts: 0, lockedUntil: null }
    const parsed = JSON.parse(raw) as Partial<PinLockState>
    return {
      failedAttempts:
        typeof parsed.failedAttempts === 'number' && parsed.failedAttempts > 0
          ? Math.floor(parsed.failedAttempts)
          : 0,
      lockedUntil:
        typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > 0
          ? parsed.lockedUntil
          : null,
    }
  } catch {
    // secure-store rusak → anggap belum pernah salah PIN.
    return { failedAttempts: 0, lockedUntil: null }
  }
}

export async function savePinLock(state: PinLockState): Promise<void> {
  try {
    await SecureStore.setItemAsync(PIN_LOCK_KEY, JSON.stringify(state))
  } catch {
    // persist gagal → lock tetap berlaku di sesi ini (tidak fatal).
  }
}

export async function clearPinLock(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PIN_LOCK_KEY)
  } catch {
    // non-fatal
  }
}
