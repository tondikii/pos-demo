import { useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut, ZoomIn, useReducedMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Icon from '../../src/components/Icon'
import { useSession } from '../../src/auth/session'
import PrinterStatus from '../../src/components/print/PrinterStatus'
import SyncBadge from '../../src/components/pos/SyncBadge'
import { COLORS } from '../../src/theme'
import { CartProvider, useCart, type CartVariantRef } from '../../src/lib/cart'
import {
  MOCK_CATEGORIES,
  MOCK_OUTLET_CONFIG,
  MOCK_PAYMENT_METHODS,
  MOCK_PRODUCTS,
  type MockProduct,
} from '../../src/lib/mock-data'
import { enqueueTransaction, type QueuedTransactionPayload } from '../../src/db/queue'
import { useActiveShift } from '../../src/db/use-shift'
import ProductGrid from '../../src/components/pos/ProductGrid'
import CartPanel from '../../src/components/pos/CartPanel'
import PayBar from '../../src/components/pos/PayBar'
import StrukPreview from '../../src/components/pos/StrukPreview'
import ShiftPrompt from '../../src/components/pos/ShiftPrompt'

/** Overlay sukses singkat (ZoomIn check) sebelum struk preview — a11y reduced-motion aware. */
function SuccessOverlay({ visible }: { visible: boolean }) {
  const reducedMotion = useReducedMotion()
  if (!visible) return null
  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(150) : ZoomIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.successOverlay}
      pointerEvents="none"
    >
      <View style={styles.successCircle}>
        <Icon name="check" size={40} color={COLORS.success} />
      </View>
      <Text style={styles.successTitle}>Pembayaran Berhasil</Text>
    </Animated.View>
  )
}

/** Isi layar kasir — butuh CartProvider (cart state). */
function PosContent() {
  const {
    items,
    paymentMethodId,
    cashReceived,
    change,
    totals,
    addItem,
    clear,
  } = useCart()

  const { session } = useSession()
  const { active, loading: shiftLoading, reload: reloadShift } = useActiveShift(
    session?.outletId ?? '',
    session?.id ?? '',
  )

  const hasOpenShift = active?.shift.status === 'open'

  const [lastTx, setLastTx] = useState<QueuedTransactionPayload | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const cashMethod = MOCK_PAYMENT_METHODS.find((m) => m.type === 'cash')
  const isCash = paymentMethodId !== null && paymentMethodId === cashMethod?.id

  const canCheckout =
    items.length > 0 &&
    paymentMethodId !== null &&
    change !== null &&
    !isSaving &&
    hasOpenShift

  const buildPayload = useCallback((): QueuedTransactionPayload => {
    const offlineId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    return {
      offlineId,
      outletId: MOCK_OUTLET_CONFIG.id,
      staffId: session?.id ?? 'stf-demo-pusat',
      shiftId: active?.shift?.id ?? null,
      paymentMethodId: paymentMethodId ?? MOCK_PAYMENT_METHODS[0].id,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      serviceAmount: totals.serviceAmount,
      total: totals.total,
      cashReceived: isCash ? cashReceived : undefined,
      change: isCash ? (change ?? 0) : undefined,
      items: items.map((i) => ({
        productVariantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        sellPrice: i.sellPrice,
        costPrice: i.costPrice,
        qty: i.qty,
        lineTotal: i.sellPrice * i.qty,
      })),
      createdAt: Date.now(),
    }
  }, [items, totals, paymentMethodId, cashReceived, change, isCash, active, session?.id])

  /** BAYAR: simpan ke antrean SQLite (offline-first sejak awal) → sukses → struk preview. */
  const handleCheckout = useCallback(() => {
    if (!canCheckout) return
    setIsSaving(true)
    const payload = buildPayload()
    void enqueueTransaction(payload)
      .then(() => {
        setLastTx(payload)
        clear()
        setShowSuccess(true)
        // Overlay sukses singkat → struk (delay 400ms; jangan blok UX).
        setTimeout(() => {
          setShowSuccess(false)
          setShowReceipt(true)
        }, 400)
      })
      .catch(() => {
        // Gagal simpan (jarang) — tetap tampilkan struk, tanpa antrean.
        setLastTx(payload)
        setShowReceipt(true)
      })
      .finally(() => setIsSaving(false))
  }, [canCheckout, buildPayload, clear])

  const handleAddItem = useCallback(
    (product: MockProduct, variant: CartVariantRef) => {
      addItem(
        {
          id: product.id,
          name: product.name,
          category: product.category,
          costPrice: product.costPrice,
        },
        variant,
      )
    },
    [addItem],
  )

  const closeReceipt = useCallback(() => setShowReceipt(false), [])

  return (
    <View style={styles.container}>
      {/* Prompt buka shift: card besar + form inline (PRD Flow 3.1). */}
      {!shiftLoading && !hasOpenShift ? (
        <ShiftPrompt onOpened={() => void reloadShift()} />
      ) : null}

      <View style={styles.body}>
        <View style={styles.leftPane}>
          <ProductGrid
            products={MOCK_PRODUCTS}
            categories={MOCK_CATEGORIES}
            onAddItem={handleAddItem}
          />
        </View>

        <View style={styles.rightPane}>
          <CartPanel paymentMethods={MOCK_PAYMENT_METHODS} />
          <PayBar
            disabled={!canCheckout}
            onPress={handleCheckout}
            disabledHint={hasOpenShift ? undefined : 'Buka shift dulu'}
          />
        </View>
      </View>

      <SuccessOverlay visible={showSuccess} />

      <StrukPreview
        visible={showReceipt}
        transaction={lastTx}
        onClose={closeReceipt}
      />
    </View>
  )
}

export default function PosScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useSession()

  const handleLogout = useCallback(() => {
    void signOut().then(() => router.replace('/(auth)/login'))
  }, [router, signOut])

  return (
    <CartProvider taxPercent={MOCK_OUTLET_CONFIG.taxPercent} servicePercent={MOCK_OUTLET_CONFIG.servicePercent}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header POS: judul outlet + status (bukan navigasi — bottom nav yang navigasi). */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.outletDot} />
            <View>
              <Text style={styles.outletName} numberOfLines={1}>
                {MOCK_OUTLET_CONFIG.name}
              </Text>
              <Text style={styles.cashierName}>Kasir</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <SyncBadge />
            <PrinterStatus />
            <Pressable
              onPress={handleLogout}
              hitSlop={6}
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Keluar dari akun kasir"
            >
              <Text style={styles.logoutText}>Keluar</Text>
            </Pressable>
          </View>
        </View>

        <PosContent />
      </View>
    </CartProvider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  outletDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  outletName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cashierName: { fontSize: 12, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerSoft,
  },
  logoutBtnPressed: { backgroundColor: COLORS.dangerSoft },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },
  body: { flex: 1, flexDirection: 'row', padding: 12, gap: 12 },
  leftPane: { flex: 1, minWidth: 0 },
  rightPane: {
    width: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.successOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    gap: 12,
  },
  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { color: COLORS.onSuccess, fontSize: 18, fontWeight: '800' },
})
