import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native'
import Animated, { FadeIn, FadeOut, ZoomIn, useReducedMotion } from 'react-native-reanimated'

import Icon from '../../src/components/Icon'
import HeaderBar from '../../src/components/HeaderBar'
import StatusPill from '../../src/components/ui/StatusPill'
import Sheet from '../../src/components/ui/Sheet'
import Button from '../../src/components/ui/Button'
import { useSession } from '../../src/auth/session'
import { COLORS } from '../../src/theme'
import { CartProvider, useCart } from '../../src/lib/cart'
import { hapticLight, hapticMedium, hapticSuccess } from '../../src/lib/haptics'
import {
  MOCK_CATEGORIES,
  MOCK_OUTLET_CONFIG,
  MOCK_PAYMENT_METHODS,
  MOCK_PRODUCTS,
  type MockProduct,
} from '../../src/lib/mock-data'
import { enqueueTransaction, type QueuedTransactionPayload } from '../../src/db/queue'
import { openShift } from '../../src/db/shift'
import { useActiveShift } from '../../src/db/use-shift'
import ProductGrid from '../../src/components/pos/ProductGrid'
import VariantSheet from '../../src/components/pos/VariantSheet'
import CartBar from '../../src/components/pos/CartBar'
import CartSheet from '../../src/components/pos/CartSheet'
import CartPanelContent from '../../src/components/pos/CartPanelContent'
import ReceiptSheet from '../../src/components/pos/ReceiptSheet'
import { formatIDR, formatMoneyInput, formatNumber, parseMoneyInput } from '../../src/lib/format'

/** Overlay sukses singkat — NETRAL (surface + aksen hijau tipis). */
function SuccessOverlay({ visible }: { visible: boolean }) {
  const reducedMotion = useReducedMotion()
  if (!visible) return null
  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(150) : FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 bg-surface items-center justify-center gap-2.5 z-50"
      pointerEvents="none"
    >
      <Animated.View
        entering={reducedMotion ? FadeIn.duration(150) : ZoomIn.duration(250)}
        className="w-[76px] h-[76px] rounded-full bg-success-soft border border-success-border items-center justify-center"
      >
        <Icon name="check" size={36} color={COLORS.success} />
      </Animated.View>
      <Text className="text-[18px] font-extrabold text-text tracking-[-0.02em]">Pembayaran Berhasil</Text>
      <Text className="text-[13px] text-text-muted">Menyiapkan struk…</Text>
    </Animated.View>
  )
}

/**
 * State LOCK "belum ada shift" — menggantikan SELURUH area grid (bug #1/#2):
 * grid & search tidak bisa diakses, satu-satunya aksi = Buka Shift (sheet).
 */
function ShiftLockState({ onOpenShift }: { onOpenShift: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-3">
      <View
        className="w-16 h-16 rounded-full bg-primary-soft items-center justify-center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name="lock" size={30} color="#2563EB" />
      </View>
      <Text className="text-[18px] font-extrabold text-text tracking-[-0.02em] text-center">
        Belum ada shift
      </Text>
      <Text className="text-[13px] text-text-muted text-center leading-5 max-w-[340px]">
        Buka shift dulu — produk baru bisa dijual setelah shift dimulai.
      </Text>
      <Button label="Buka Shift" onPress={onOpenShift} className="mt-2 self-center px-8" />
    </View>
  )
}

/** Sheet buka shift — form kas awal yang menutup penuh (tanpa tumpang tindih). */
function ShiftOpenSheet({
  visible,
  onClose,
  onOpened,
}: {
  visible: boolean
  onClose: () => void
  onOpened: () => void
}) {
  const { session } = useSession()
  const [cash, setCash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleOpen = useCallback(async () => {
    if (!session || saving) return
    setError(null)
    setSaving(true)
    try {
      const openingCash = parseMoneyInput(cash)
      const result = await openShift(session.outletId, session.id, openingCash)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCash('')
      onOpened()
      onClose()
    } catch {
      setError('Gagal membuka shift. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }, [cash, session, saving, onOpened, onClose])

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Buka Shift"
      subtitle="Kas awal di laci — bisa diisi 0."
      maxHeight="55%"
    >
      <View className="px-4 pb-4 gap-2.5" style={Platform.OS === 'web' ? ({ gap: 10 } as const) : undefined}>
        <View className="flex-row items-center h-14 rounded-xl bg-bg border border-border px-3 gap-1.5">
          <Text className="text-[16px] font-bold text-text-muted" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Rp
          </Text>
          <TextInput
            value={cash}
            onChangeText={(t) => setCash(formatMoneyInput(t))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#94A3B8"
            className="flex-1 text-[18px] font-bold text-text p-0 tabular-nums"
            accessibilityLabel="Kas awal, default 0"
          />
        </View>
        <Text className="text-[12px] text-text-muted">
          Jumlah uang tunai di laci saat shift dimulai. Diisi 0 jika kosong.
        </Text>
        {error ? <Text className="text-[13px] font-semibold text-danger">{error}</Text> : null}
        <Button
          label={saving ? 'Membuka…' : 'Buka Shift'}
          onPress={() => void handleOpen()}
          disabled={saving}
          loading={saving}
          className="mt-1"
        />
        <Button label="Nanti" variant="ghost" size="md" onPress={onClose} />
      </View>
    </Sheet>
  )
}

/** Isi layar kasir — butuh CartProvider. */
function PosContent() {
  const { items, totals, paymentMethodId, cashReceived, change, addItem, clear, setNote } = useCart()
  const { session } = useSession()
  const { active, loading: shiftLoading, reload: reloadShift } = useActiveShift(
    session?.outletId ?? '',
    session?.id ?? '',
  )
  const hasOpenShift = active?.shift.status === 'open'
  const locked = !shiftLoading && !hasOpenShift

  const [lastTx, setLastTx] = useState<QueuedTransactionPayload | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [variantProduct, setVariantProduct] = useState<MockProduct | null>(null)
  const [showShiftOpen, setShowShiftOpen] = useState(false)
  const { width } = useWindowDimensions()
  const isTablet = width >= 768

  // Bug #1: saat shift terkunci (belum dibuka / sudah tutup), cart dikosongkan
  // — tidak ada item yang terbawa antar shift.
  useEffect(() => {
    if (locked) clear()
  }, [locked, clear])

  const cashMethod = MOCK_PAYMENT_METHODS.find((m) => m.type === 'cash')
  const isCash = paymentMethodId !== null && paymentMethodId === cashMethod?.id

  const canCheckout =
    !locked &&
    items.length > 0 &&
    paymentMethodId !== null &&
    (!isCash || change !== null) &&
    !isSaving

  // Badge qty per produk di grid (jumlah qty semua varian produk itu).
  const cartQtys = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, i) => {
      acc[i.productId] = (acc[i.productId] ?? 0) + i.qty
      return acc
    }, {})
  }, [items])

  // Counter produk per kategori untuk chip filter.
  const categoryCounts = useMemo(() => {
    return MOCK_PRODUCTS.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1
      return acc
    }, {})
  }, [])

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
        note: i.note,
      })),
      createdAt: Date.now(),
    }
  }, [items, totals, paymentMethodId, cashReceived, change, isCash, active, session?.id])

  /** BAYAR: simpan ke antrean SQLite (offline-first) → sukses → struk preview. */
  const handleCheckout = useCallback(() => {
    if (!canCheckout) return
    setIsSaving(true)
    const payload = buildPayload()
    void enqueueTransaction(payload)
      .then(() => {
        setLastTx(payload)
        clear()
        setCartOpen(false)
        setShowSuccess(true)
        hapticSuccess()
        void reloadShift()
        setTimeout(() => {
          setShowSuccess(false)
          setShowReceipt(true)
        }, 400)
      })
      .catch(() => {
        setLastTx(payload)
        setCartOpen(false)
        setShowReceipt(true)
      })
      .finally(() => setIsSaving(false))
  }, [canCheckout, buildPayload, clear, reloadShift])

  const handleAdd = useCallback(
    (product: MockProduct, variantId: string) => {
      const variant = product.variants.find((v) => v.id === variantId)
      if (!variant) return
      addItem(
        {
          id: product.id,
          name: product.name,
          category: product.category,
          costPrice: product.costPrice,
        },
        variant,
      )
      hapticLight()
    },
    [addItem],
  )

  /** Kartu 1 varian → tambah langsung (1 tap); multi varian → sheet (2 tap). */
  const handleCardTap = useCallback(
    (product: MockProduct) => {
      if (product.variants.length === 1) {
        handleAdd(product, product.variants[0].id)
      } else {
        setVariantProduct(product)
      }
    },
    [handleAdd],
  )

  /** Quick-add: long-press → +1 langsung (varian pertama) tanpa sheet. */
  const handleQuickAdd = useCallback(
    (product: MockProduct) => {
      const first = product.variants[0]
      if (!first || first.stock <= 0) return
      handleAdd(product, first.id)
      hapticMedium()
    },
    [handleAdd],
  )

  return (
    <View className="flex-1">
      {isTablet ? (
        /* ===== TABLET LANDSCAPE: grid kiri + cart panel tetap kanan ===== */
        <View className="flex-1 flex-row">
          <View className="flex-1">
            {locked ? (
              <ShiftLockState onOpenShift={() => setShowShiftOpen(true)} />
            ) : (
              <ProductGrid
                products={MOCK_PRODUCTS}
                categories={MOCK_CATEGORIES}
                onAdd={handleCardTap}
                onNeedVariant={setVariantProduct}
                onQuickAdd={handleQuickAdd}
                cartQtys={cartQtys}
                categoryCounts={categoryCounts}
              />
            )}
          </View>
          <View className="w-[34%] max-w-[420px] border-l border-border bg-surface">
            <View className="flex-row items-center justify-between px-4 pt-3 pb-2 border-b border-border">
              <View>
                <Text className="text-[15px] font-bold text-text tracking-[-0.01em]">Keranjang</Text>
                <Text className="text-[12px] text-text-muted">
                  {items.length > 0
                    ? `${formatNumber(totals.itemCount)} item · ${formatIDR(totals.total)}`
                    : 'Belum ada item'}
                </Text>
              </View>
              {items.length > 0 ? (
                <Pressable
                  onPress={clear}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Kosongkan keranjang"
                  className="h-12 px-3 justify-center"
                >
                  <Text className="text-[12px] font-semibold text-danger">Kosongkan</Text>
                </Pressable>
              ) : null}
            </View>
            <CartPanelContent
              onCheckout={handleCheckout}
              canCheckout={canCheckout}
              disabledHint={locked ? 'Buka shift dulu' : undefined}
              saving={isSaving}
              paymentMethods={MOCK_PAYMENT_METHODS}
              onSetNote={setNote}
            />
          </View>
        </View>
      ) : (
        /* ===== PHONE: grid + cart bar + bottom sheet ===== */
        <>
          {locked ? (
            <ShiftLockState onOpenShift={() => setShowShiftOpen(true)} />
          ) : (
            <ProductGrid
              products={MOCK_PRODUCTS}
              categories={MOCK_CATEGORIES}
              onAdd={handleCardTap}
              onNeedVariant={setVariantProduct}
              onQuickAdd={handleQuickAdd}
              cartQtys={cartQtys}
              categoryCounts={categoryCounts}
            />
          )}

          {!locked ? (
            <View className="absolute left-0 right-0 bottom-0 px-3 pb-2">
              <CartBar
                itemCount={totals.itemCount}
                total={totals.total}
                onPress={() => setCartOpen(true)}
              />
            </View>
          ) : null}

          <CartSheet
            visible={cartOpen && !locked}
            onClose={() => setCartOpen(false)}
            onCheckout={handleCheckout}
            canCheckout={canCheckout}
            disabledHint={locked ? 'Buka shift dulu' : undefined}
            saving={isSaving}
            paymentMethods={MOCK_PAYMENT_METHODS}
          />
        </>
      )}

      <ShiftOpenSheet
        visible={showShiftOpen}
        onClose={() => setShowShiftOpen(false)}
        onOpened={() => void reloadShift()}
      />

      <VariantSheet
        product={variantProduct}
        onClose={() => setVariantProduct(null)}
        onSelect={(product, variantId) => {
          handleAdd(product, variantId)
          setVariantProduct(null)
        }}
      />

      <SuccessOverlay visible={showSuccess} />

      <ReceiptSheet visible={showReceipt} transaction={lastTx} onClose={() => setShowReceipt(false)} />
    </View>
  )
}

export default function PosScreen() {
  const router = useRouter()
  const { session, signOut } = useSession()

  const handleLogout = useCallback(() => {
    void signOut().then(() => router.replace('/(auth)/login'))
  }, [router, signOut])

  return (
    <CartProvider
      taxPercent={MOCK_OUTLET_CONFIG.taxPercent}
      servicePercent={MOCK_OUTLET_CONFIG.servicePercent}
      cashMethodId={MOCK_PAYMENT_METHODS.find((m) => m.type === 'cash')?.id ?? null}
    >
      <View className="flex-1 bg-bg">
        {/* Header seragam: avatar outlet + identitas menu "Kasir" + outlet · profil kasir + status + logout. */}
        <HeaderBar
          title="Kasir"
          outlet={session?.outletName ?? MOCK_OUTLET_CONFIG.name}
          profile={session?.name ?? 'Kasir'}
          avatarLabel={session?.outletName ?? MOCK_OUTLET_CONFIG.name}
          right={
            <View className="flex-row items-center gap-1">
              <StatusPill />
              <Pressable
                onPress={handleLogout}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Keluar dari akun kasir"
                className="w-12 h-12 -mr-2 rounded-xl items-center justify-center active:bg-surfaceMuted"
              >
                <Icon name="logout" size={20} color={COLORS.textMuted} />
              </Pressable>
            </View>
          }
        />

        <PosContent />
      </View>
    </CartProvider>
  )
}