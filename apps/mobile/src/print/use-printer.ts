import { useCallback, useEffect, useState } from 'react'

import {
  connectPrinter,
  getPrinterState,
  printReceipt,
  subscribePrinter,
  type PrintResult,
  type PrinterState,
} from './print-service'

/**
 * Hook printer — Fase 2B.6 (mock). API stabil untuk Fase 3B.5 BLE:
 * `{ connected, printerName, printing, print, connect }`. UI tidak berubah
 * saat print-service diganti implementasi asli (react-native-ble-plx).
 *
 * - `print(text)` → `PrintResult`; selalu return meski gagal (post-payment,
 *   tidak pernah memblok transaksi — lihat StrukPreview di pos.tsx).
 * - `connected` reaktif (subscribe state printer; 3B.5: BLE events).
 * - `printing` untuk disable tombol + feedback selama menunggu.
 */
export function usePrinter() {
  const [state, setState] = useState<PrinterState>(() => getPrinterState())
  const [printing, setPrinting] = useState(false)

  // Ikuti perubahan state printer (mock: subscribePrinter; 3B.5: BLE events).
  useEffect(() => {
    return subscribePrinter(setState)
  }, [])

  const connect = useCallback(async (): Promise<PrinterState> => {
    return connectPrinter()
  }, [])

  const print = useCallback(async (text: string): Promise<PrintResult> => {
    setPrinting(true)
    try {
      return await printReceipt(text)
    } finally {
      setPrinting(false)
    }
  }, [])

  return {
    connected: state.connected,
    printerName: state.name,
    printing,
    print,
    connect,
  }
}
