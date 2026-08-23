import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react'

/**
 * Keranjang kasir — context + reducer murni lokal (offline-first, Fase 2B.2).
 * Uang disimpan sebagai number integer Rupiah; pajak/layanan dibulatkan ke
 * Rupiah penuh agar `total === subtotal + pajak + layanan` selalu tepat.
 */

export type CartProductRef = {
  id: string
  name: string
  category: string
  costPrice: number
}

export type CartVariantRef = {
  id: string
  productId: string
  name: string
  sellPrice: number
  stock: number
  lowStockThreshold: number
  note?: string
}

export type CartItem = {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sellPrice: number
  costPrice: number
  qty: number
  maxStock: number
  /** Catatan singkat item (mis. "less sugar") — opsional, F&B (PRD). */
  note?: string
}

export type CartState = {
  items: CartItem[]
  paymentMethodId: string | null
  cashReceivedText: string // string input — di-parse saat checkout
}

export type CartAction =
  | { type: 'ADD_ITEM'; product: CartProductRef; variant: CartVariantRef }
  | { type: 'INC'; variantId: string }
  | { type: 'DEC'; variantId: string }
  | { type: 'REMOVE'; variantId: string }
  | { type: 'SET_NOTE'; variantId: string; note: string }
  | { type: 'CLEAR' }
  | { type: 'SET_PAYMENT_METHOD'; paymentMethodId: string }
  | { type: 'SET_CASH_RECEIVED'; text: string }

function upsertLine(
  items: CartItem[],
  product: CartProductRef,
  variant: CartVariantRef,
  qty: number,
): CartItem[] {
  const existing = items.find((i) => i.variantId === variant.id)
  if (!existing) {
    return [
      ...items,
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        variantName: variant.name,
        sellPrice: variant.sellPrice,
        costPrice: product.costPrice,
        qty,
        maxStock: variant.stock,
      },
    ]
  }
  return items.map((i) =>
    i.variantId === variant.id
      ? { ...i, qty: Math.min(i.qty + qty, i.maxStock), note: i.note ?? variant.note }
      : i,
  )
}

/** Reducer keranjang — diekspor untuk unit test (murni, tanpa side effect). */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, variant } = action
      return { ...state, items: upsertLine(state.items, product, variant, 1) }
    }
    case 'INC': {
      return {
        ...state,
        items: state.items.map((i) =>
          i.variantId === action.variantId
            ? { ...i, qty: Math.min(i.qty + 1, i.maxStock) }
            : i,
        ),
      }
    }
    case 'DEC': {
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.variantId === action.variantId ? { ...i, qty: i.qty - 1 } : i,
          )
          .filter((i) => i.qty > 0),
      }
    }
    case 'REMOVE': {
      return { ...state, items: state.items.filter((i) => i.variantId !== action.variantId) }
    }
    case 'SET_NOTE': {
      return {
        ...state,
        items: state.items.map((i) =>
          i.variantId === action.variantId ? { ...i, note: action.note } : i,
        ),
      }
    }
    case 'CLEAR': {
      return { ...state, items: [], cashReceivedText: '' }
    }
    case 'SET_PAYMENT_METHOD': {
      return { ...state, paymentMethodId: action.paymentMethodId }
    }
    case 'SET_CASH_RECEIVED': {
      return { ...state, cashReceivedText: action.text }
    }
    default:
      return state
  }
}

export type CartTotals = {
  subtotal: number
  taxPercent: number
  servicePercent: number
  taxAmount: number
  serviceAmount: number
  total: number
  itemCount: number
}

export function computeTotals(items: CartItem[], taxPercent: number, servicePercent: number): CartTotals {
  const subtotal = items.reduce((sum, i) => sum + i.sellPrice * i.qty, 0)
  const taxAmount = Math.round((subtotal * taxPercent) / 100)
  const serviceAmount = Math.round((subtotal * servicePercent) / 100)
  return {
    subtotal,
    taxPercent,
    servicePercent,
    taxAmount,
    serviceAmount,
    total: subtotal + taxAmount + serviceAmount,
    itemCount: items.reduce((sum, i) => sum + i.qty, 0),
  }
}

export type CartContextValue = {
  items: CartItem[]
  paymentMethodId: string | null
  cashReceivedText: string
  setPaymentMethodId: (id: string) => void
  setCashReceivedText: (text: string) => void
  addItem: (product: CartProductRef, variant: CartVariantRef) => void
  increment: (variantId: string) => void
  decrement: (variantId: string) => void
  removeItem: (variantId: string) => void
  setNote: (variantId: string, note: string) => void
  clear: () => void
  totals: CartTotals
  cashReceived: number
  change: number | null
  canCheckout: boolean
}

const CartContext = createContext<CartContextValue | null>(null)

const INITIAL_STATE: CartState = { items: [], paymentMethodId: null, cashReceivedText: '' }

export function CartProvider({
  children,
  taxPercent = 0,
  servicePercent = 0,
  cashMethodId,
}: {
  children: React.ReactNode
  taxPercent?: number
  servicePercent?: number
  /**
   * id metode bayar tunai — dipakai untuk logika `canCheckout`:
   * cek kecukupan uang diterima HANYA untuk metode cash.
   */
  cashMethodId?: string | null
}) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_STATE)

  const addItem = useCallback(
    (product: CartProductRef, variant: CartVariantRef) =>
      dispatch({ type: 'ADD_ITEM', product, variant }),
    [],
  )
  const increment = useCallback((variantId: string) => dispatch({ type: 'INC', variantId }), [])
  const decrement = useCallback((variantId: string) => dispatch({ type: 'DEC', variantId }), [])
  const removeItem = useCallback((variantId: string) => dispatch({ type: 'REMOVE', variantId }), [])
  const setNote = useCallback(
    (variantId: string, note: string) => dispatch({ type: 'SET_NOTE', variantId, note }),
    [],
  )
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const setPaymentMethodId = useCallback(
    (paymentMethodId: string) => dispatch({ type: 'SET_PAYMENT_METHOD', paymentMethodId }),
    [],
  )
  const setCashReceivedText = useCallback(
    (text: string) => {
      // format ribuan otomatis: "15000" → "15.000" (hanya angka)
      const digits = text.replace(/\D/g, '')
      const formatted = digits
        ? new Intl.NumberFormat('id-ID').format(Number(digits))
        : ''
      dispatch({ type: 'SET_CASH_RECEIVED', text: formatted })
    },
    [],
  )

  const totals = useMemo(
    () => computeTotals(state.items, taxPercent, servicePercent),
    [state.items, taxPercent, servicePercent],
  )

  const cashReceived = useMemo(() => {
    const n = Number(state.cashReceivedText.replace(/\D/g, ''))
    return Number.isFinite(n) ? n : 0
  }, [state.cashReceivedText])

  const change = useMemo(
    () => (cashReceived >= totals.total ? cashReceived - totals.total : null),
    [cashReceived, totals.total],
  )

  const canCheckout =
    state.items.length > 0 &&
    state.paymentMethodId !== null &&
    (state.paymentMethodId !== cashMethodId || change !== null)

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      paymentMethodId: state.paymentMethodId,
      cashReceivedText: state.cashReceivedText,
      setPaymentMethodId,
      setCashReceivedText,
      addItem,
      increment,
      decrement,
      removeItem,
      setNote,
      clear,
      totals,
      cashReceived,
      change,
      canCheckout,
    }),
    [
      state.items,
      state.paymentMethodId,
      state.cashReceivedText,
      setPaymentMethodId,
      setCashReceivedText,
      addItem,
      increment,
      decrement,
      removeItem,
      setNote,
      clear,
      totals,
      cashReceived,
      change,
      canCheckout,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart harus dipakai di dalam <CartProvider>')
  return ctx
}
