import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import {
  getActiveShift,
  getShiftHistory,
  type ActiveShiftView,
} from './shift'
import type { ShiftRow } from './shift'
import type { ShiftTxSummary } from './shift-types'
import type { QueuedTransactionPayload } from './queue'

export type ShiftHistoryItem = ShiftRow & {
  summary: ShiftTxSummary
  transactions: QueuedTransactionPayload[]
}

/**
 * Hook shift aktif untuk screen POS & Shift — reload otomatis tiap layar
 * dapat fokus (kembali dari /shift, selesai buka/tutup, dll).
 */
export function useActiveShift(outletId: string, staffId: string) {
  const [active, setActive] = useState<ActiveShiftView | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const view = await getActiveShift(outletId, staffId)
      setActive(view)
    } finally {
      setLoading(false)
    }
  }, [outletId, staffId])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  return { active, loading, reload }
}

/** Riwayat shift outlet (opsional filter staff), reload saat fokus. */
export function useShiftHistory(outletId: string, staffId?: string) {
  const [history, setHistory] = useState<ShiftHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getShiftHistory(outletId, staffId)
      setHistory(rows as ShiftHistoryItem[])
    } finally {
      setLoading(false)
    }
  }, [outletId, staffId])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  return { history, loading, reload }
}
