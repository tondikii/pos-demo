import { describe, expect, it } from 'vitest'
import { cartReducer, computeTotals, type CartState } from './cart'

const variant = (id: string, sellPrice = 15000, stock = 10) => ({
  id,
  productId: 'p1',
  name: 'S',
  sellPrice,
  stock,
  lowStockThreshold: 5,
})

const product = { id: 'p1', name: 'Espresso', category: 'Kopi', costPrice: 5000 }

function state(overrides: Partial<CartState> = {}): CartState {
  return { items: [], paymentMethodId: null, cashReceivedText: '', ...overrides }
}

describe('cart reducer', () => {
  it('ADD_ITEM: item baru ditambah, item sama di-merge + qty naik (cap stok)', () => {
    const s1 = cartReducer(state(), { type: 'ADD_ITEM', product, variant: variant('v1') })
    expect(s1.items).toHaveLength(1)
    expect(s1.items[0].qty).toBe(1)

    const s2 = cartReducer(s1, { type: 'ADD_ITEM', product, variant: variant('v1') })
    expect(s2.items).toHaveLength(1)
    expect(s2.items[0].qty).toBe(2)
  })

  it('ADD_ITEM: qty tidak melewati stok (maxStock)', () => {
    let s = state()
    for (let i = 0; i < 12; i++) {
      s = cartReducer(s, { type: 'ADD_ITEM', product, variant: variant('v1', 15000, 10) })
    }
    expect(s.items[0].qty).toBe(10)
  })

  it('INC/DEC/REMOVE mengubah qty & menghapus saat 0', () => {
    let s = cartReducer(state(), { type: 'ADD_ITEM', product, variant: variant('v1') })
    s = cartReducer(s, { type: 'INC', variantId: 'v1' })
    expect(s.items[0].qty).toBe(2)
    s = cartReducer(s, { type: 'DEC', variantId: 'v1' })
    s = cartReducer(s, { type: 'DEC', variantId: 'v1' })
    expect(s.items).toHaveLength(0)
  })

  it('CLEAR mengosongkan item dan uang diterima', () => {
    const s = cartReducer(
      state({ cashReceivedText: '50.000' }),
      { type: 'ADD_ITEM', product, variant: variant('v1') },
    )
    const cleared = cartReducer(s, { type: 'CLEAR' })
    expect(cleared.items).toHaveLength(0)
    expect(cleared.cashReceivedText).toBe('')
  })

  it('SET_NOTE menyimpan catatan item', () => {
    let s = cartReducer(state(), { type: 'ADD_ITEM', product, variant: variant('v1') })
    s = cartReducer(s, { type: 'SET_NOTE', variantId: 'v1', note: 'less sugar' })
    expect(s.items[0].note).toBe('less sugar')
  })
})

describe('computeTotals', () => {
  it('subtotal + pajak + layanan = total (pembulatan rupiah penuh)', () => {
    const items = [
      { variantId: 'v1', productId: 'p1', productName: 'Espresso', variantName: 'S', sellPrice: 15000, costPrice: 5000, qty: 2, maxStock: 10 },
      { variantId: 'v2', productId: 'p1', productName: 'Espresso', variantName: 'L', sellPrice: 22000, costPrice: 5000, qty: 1, maxStock: 10 },
    ]
    const t = computeTotals(items, 11, 0)
    expect(t.subtotal).toBe(52000)
    expect(t.taxAmount).toBe(5720)
    expect(t.serviceAmount).toBe(0)
    expect(t.total).toBe(57720)
    expect(t.itemCount).toBe(3)
  })
})