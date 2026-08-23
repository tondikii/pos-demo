import React from 'react'
import { Pressable, Text } from 'react-native'

import Sheet from '../ui/Sheet'
import CartPanelContent from './CartPanelContent'
import { useCart } from '../../lib/cart'
import { formatIDR, formatNumber } from '../../lib/format'
import type { MockPaymentMethod } from '../../lib/mock-data'

/**
 * Cart sheet (PHONE <768px) — wrapper tipis di atas CartPanelContent
 * (satu source of truth dengan panel tablet). Header + close + Kosongkan
 * dikelola di sini; konten checkout di CartPanelContent.
 */
export default function CartSheet({
  visible,
  onClose,
  onCheckout,
  canCheckout,
  disabledHint,
  saving,
  paymentMethods,
}: {
  visible: boolean
  onClose: () => void
  onCheckout: () => void
  canCheckout: boolean
  disabledHint?: string
  saving?: boolean
  paymentMethods: MockPaymentMethod[]
}) {
  const { items, totals, clear, setNote } = useCart()
  const hasItems = items.length > 0

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Keranjang"
      subtitle={`${formatNumber(totals.itemCount)} item · ${formatIDR(totals.total)}`}
      height="88%"
      right={
        hasItems ? (
          <Pressable
            onPress={clear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Kosongkan keranjang"
            className="h-12 px-3 justify-center"
          >
            <Text className="text-[13px] font-bold text-danger">Kosongkan</Text>
          </Pressable>
        ) : undefined
      }
    >
      <CartPanelContent
        onCheckout={onCheckout}
        canCheckout={canCheckout}
        disabledHint={disabledHint}
        saving={saving}
        paymentMethods={paymentMethods}
        onSetNote={setNote}
      />
    </Sheet>
  )
}