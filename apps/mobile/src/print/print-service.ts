import type { QueuedTransactionPayload } from '../db/queue'
import { buildReceiptText } from '../lib/receipt'

/**
 * Mock print engine — Fase 2B.6 (tanpa BLE asli).
 *
 * Interface sengaja IDENTIK dengan implementasi react-native-ble-plx +
 * ESC/POS builder di Fase 3B.5 (skill pos-print / ARCHITECTURE.md §8):
 * pemanggil UI cukup mengganti modul ini nanti — `printReceipt(text)`,
 * `getPrinterState()`, `connectPrinter()` tidak berubah signature.
 *
 * Fase 3B.5 nanti: text → Uint8Array ESC/POS (EscPos builder) →
 * `device.writeCharacteristicWithResponseForService(uuid, base64(bytes))`,
 * state `connected` berasal dari event BLE (connect/disconnect).
 */

export type PrintResult = { ok: boolean; error?: string }
export type PrinterState = { connected: boolean; name: string }

export const MOCK_PRINTER_NAME = 'RPP02N (58mm)'

const PRINT_DELAY_MS = 600 // simulasi tulis buffer ke BLE
const CONNECT_DELAY_MS = 1500 // simulasi pairing
const FAILURE_RATE = 0.15 // 15% gagal acak — koneksi putus tiba-tiba
const FAILURE_ERROR = 'Printer tidak terhubung'

// State mock: printer belum terhubung saat app start (realistis — perlu
// pairing dulu lewat tombol "Coba Hubungkan"). Nanti: device BLE.
let printerConnected = false

type PrinterListener = (state: PrinterState) => void
const listeners = new Set<PrinterListener>()

/** Subscribe perubahan state printer (mock BLE events). Unsubscribe di cleanup. */
export function subscribePrinter(listener: PrinterListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emitPrinterState(): void {
  const state = getPrinterState()
  listeners.forEach((l) => l(state))
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Status printer saat ini (mock). */
export function getPrinterState(): PrinterState {
  return { connected: printerConnected, name: MOCK_PRINTER_NAME }
}

/** Simulasi pairing/connect printer (1.5s). Fase 3B.5: BleManager.connectToDevice. */
export async function connectPrinter(): Promise<PrinterState> {
  await delay(CONNECT_DELAY_MS)
  printerConnected = true
  emitPrinterState()
  return getPrinterState()
}

/**
 * Cetak struk (mock): delay 600ms meniru tulis ESC/POS, lalu 15% gagal.
 * Tidak pernah throw — selalu return PrintResult agar UI bisa kasih
 * feedback (toast sukses/gagal) tanpa crash.
 */
export async function printReceipt(text: string): Promise<PrintResult> {
  void text // Fase 3B.5: text → ESC/POS bytes → write BLE
  await delay(PRINT_DELAY_MS)
  if (!printerConnected || Math.random() < FAILURE_RATE) {
    return { ok: false, error: FAILURE_ERROR }
  }
  return { ok: true }
}

/**
 * Wrapper teks struk — satu-satunya pintu masuk "apa yang dicetak".
 * Fase 3B.5 tetap menerima QueuedTransactionPayload (output jadi
 * Uint8Array ESC/POS), jadi pemanggil UI tidak berubah sama sekali.
 */
export function buildPrintableText(tx: QueuedTransactionPayload): string {
  return buildReceiptText(tx)
}
