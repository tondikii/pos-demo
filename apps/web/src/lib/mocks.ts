import {
  DASHBOARD_DAYS,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '@larispos/shared'
import type { CreateProductInput, UpdateProductInput } from '@larispos/shared'

/**
 * Mock data Fase 2A.2 — dashboard ringkasan (TANPA API).
 *
 * Semua angka deterministik (seeded PRNG) agar tampilan stabil antar
 * refresh/browser, dengan sedikit "hari ini" = live (tanggal runtime) sehingga
 * filter "Hari ini" selalu punya data. Bentuk data mengikuti kontrak
 * `GET /reports/summary` & `GET /reports/low-stock` di ARCHITECTURE.md §6.
 */

/* ------------------------------------------------------------------ */
/* Toggle simulasi error (polish 2A.7)                                 */
/* ------------------------------------------------------------------ */

/**
 * Toggle error mock — dipakai memverifikasi error state di seluruh halaman
 * (dashboard, produk, laporan, shift, dll). Disimpan di sessionStorage agar
 * pilihan bertahan saat refresh, tapi tidak bocor antar tab/restart browser.
 */
const MOCK_ERROR_KEY = 'larispos_mock_error'

export function isMockErrorEnabled(): boolean {
  try {
    return sessionStorage.getItem(MOCK_ERROR_KEY) === '1'
  } catch {
    return false
  }
}

export function setMockErrorEnabled(enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(MOCK_ERROR_KEY, '1')
    else sessionStorage.removeItem(MOCK_ERROR_KEY)
  } catch {
    // private mode — abaikan
  }
}

/** Lempar error simulasi bila toggle aktif — dipanggil di tiap mock fetch. */
export function maybeThrowMockError(): void {
  if (isMockErrorEnabled()) {
    throw new Error(
      'Simulasi error aktif — matikan toggle "Simulasi error" di header lalu coba lagi.',
    )
  }
}

export interface MockOutletSummary {
  /** YYYY-MM-DD (waktu lokal outlet). */
  date: string
  /** Total penjualan (IDR). */
  omzet: number
  /** Harga pokok penjualan (IDR). */
  hpp: number
  /** Laba = omzet − hpp (IDR). */
  laba: number
  /** Jumlah transaksi selesai. */
  txCount: number
  /** Rata-rata nilai transaksi (IDR). */
  avg: number
}

export interface MockLowStockVariant {
  id: string
  productName: string
  variantName: string
  /** Stok saat ini (unit). */
  stock: number
  /** Batas peringatan per varian. */
  lowStockThreshold: number
  category: string
}

export interface MockOutlet {
  id: string
  name: string
  address: string
}

export interface MockDashboardData {
  outletId: string
  /** Data 7 hari terakhir, urutan kronologis (tertua → terbaru). */
  days: MockOutletSummary[]
}

/** Outlet mock — UUID valid (v4), bukan ID singkat seperti auth-mock. */
export const MOCK_OUTLETS: MockOutlet[] = [
  {
    id: '4c8a4e5c-2d64-4f2f-9f2a-1b8a3c5d7e01',
    name: 'Gerai Geprek Sari — Pasar Baru',
    address: 'Jl. Pasar Baru No. 12, Jakarta Pusat',
  },
  {
    id: '9f3b7d1a-6c42-4a5b-b3c1-2d8e4f6a8b02',
    name: 'Gerai Geprek Sari — Senayan',
    address: 'Jl. Asia Afrika, Senayan, Jakarta Selatan',
  },
  {
    id: 'b2c9e8f3-1a5d-4c6e-8f2a-3d7b9a1c4e03',
    name: 'Gerai Geprek Sari — Kelapa Gading',
    address: 'Jl. Kelapa Gading Boulevard, Jakarta Utara',
  },
]

export const MOCK_OUTLET_IDS: string[] = MOCK_OUTLETS.map((o) => o.id)

/** Default outlet aktif pada dashboard = outlet pertama (Pasar Baru). */
export const DEFAULT_OUTLET_ID = MOCK_OUTLETS[0].id

/**
 * Seeded PRNG (mulberry32) — deret angka deterministik per seed.
 * Dipakai agar mock data identik di semua device/refresh.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Format tanggal lokal (bukan UTC) sebagai YYYY-MM-DD. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Generate ringkasan 7 hari deterministik untuk sebuah outlet.
 * Profil per outlet (baseOmzet, growth, weekendFactor, hppRate) diturunkan
 * dari hash id outlet → angka tidak acak-acakan antar outlet.
 */
export function buildMockDays(outletId: string, count = DASHBOARD_DAYS): MockOutletSummary[] {
  const rand = mulberry32(hashSeed(outletId))
  const baseOmzet = 900_000 + rand() * 1_400_000
  const hppRate = 0.55 + rand() * 0.12
  const growth = 0.01 + rand() * 0.03
  const weekendFactor = 1.12 + rand() * 0.18

  const days: MockOutletSummary[] = []
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(new Date(), -i)
    const dayOfWeek = date.getDay() // 0 = Minggu
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const t = count - 1 - i // 0 = tertua … count-1 = hari ini
    const noise = 0.92 + rand() * 0.16
    const omzet = Math.round((baseOmzet * (1 + growth * t) * (isWeekend ? weekendFactor : 1) * noise) / 100) * 100
    const txCount = Math.max(8, Math.round(omzet / (35_000 + rand() * 25_000)))
    const hpp = round2(omzet * (hppRate + rand() * 0.02))
    const laba = round2(omzet - hpp)
    days.push({
      date: toDateKey(date),
      omzet,
      hpp,
      laba,
      txCount,
      avg: Math.round(omzet / txCount),
    })
  }
  return days
}

/** Cari ringkasan untuk satu tanggal tertentu. */
export function findDay(days: MockOutletSummary[], dateKey: string): MockOutletSummary | null {
  return days.find((d) => d.date === dateKey) ?? null
}

/** Ringkasan hari ini (data live tanggal runtime). */
export function todaySummary(days: MockOutletSummary[]): MockOutletSummary | null {
  return findDay(days, toDateKey(new Date()))
}

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Threshold per varian: default 5, sebagian kecil 3/8 agar badge bervariasi. */
const THRESHOLDS = [5, 5, 5, 3, 8, 5, 5, 3] as const

const PRODUCTS: ReadonlyArray<{ name: string; category: string; variants: readonly string[] }> = [
  { name: 'Ayam Geprek Original', category: 'Makanan', variants: ['S', 'M', 'L'] },
  { name: 'Ayam Geprek Keju', category: 'Makanan', variants: ['M', 'L'] },
  { name: 'Es Teh Manis', category: 'Minuman', variants: ['Reguler', 'Jumbo'] },
  { name: 'Es Jeruk Peras', category: 'Minuman', variants: ['Reguler', 'Jumbo'] },
  { name: 'Nasi Putih', category: 'Makanan', variants: ['Porsi'] },
  { name: 'Lele Goreng Sambal', category: 'Makanan', variants: ['M'] },
  { name: 'Tahu Crispy', category: 'Camilan', variants: ['5 pcs', '10 pcs'] },
  { name: 'Kulit Ayam Crispy', category: 'Camilan', variants: ['5 pcs'] },
  { name: 'Air Mineral', category: 'Minuman', variants: ['Botol 600ml'] },
  { name: 'Teh Botol', category: 'Minuman', variants: ['Reguler'] },
]

/**
 * Varian stok menipis (stock <= lowStockThreshold) per outlet.
 * Deterministik — pilihan & nilai dari seed outlet, status "Habis" bila stock = 0.
 * Invariant: stock SELALU <= threshold (0..threshold), jadi setiap item valid.
 */
export function buildMockLowStock(outletId: string): MockLowStockVariant[] {
  const rand = mulberry32(hashSeed(`${outletId}:lowstock`))
  const count = 3 + Math.floor(rand() * 2) // 3–4 varian per outlet
  const picks: MockLowStockVariant[] = []
  const used = new Set<number>()

  for (let i = 0; i < count; i++) {
    let idx = Math.floor(rand() * PRODUCTS.length)
    while (used.has(idx)) idx = (idx + 1) % PRODUCTS.length
    used.add(idx)

    const product = PRODUCTS[idx]
    const variantName = product.variants[Math.floor(rand() * product.variants.length)]
    const threshold = THRESHOLDS[i % THRESHOLDS.length]
    // stock di [0, threshold] — 0 berarti "Habis", sisanya "Menipis".
    const stock = Math.floor(rand() * (threshold + 1))

    picks.push({
      id: cryptoRandomUUID(),
      productName: product.name,
      variantName,
      stock,
      lowStockThreshold: threshold,
      category: product.category,
    })
  }
  return picks
}

/* ------------------------------------------------------------------ */
/* Fase 2A.5 — Laporan (mock): best sellers, jam ramai, metode bayar   */
/* ------------------------------------------------------------------ */

/** Satu baris best seller — padanan `GET /reports/best-sellers`. */
export interface MockBestSeller {
  /** Nama varian terjual (produk + varian, mis. "Ayam Geprek Original — M"). */
  variantName: string
  productName: string
  /** Jumlah unit terjual pada rentang. */
  qty: number
  /** Omzet varian = qty × harga jual (IDR). */
  omzet: number
}

/** Satu jam pada grafik jam ramai — padanan `GET /reports/busy-hours`. */
export interface MockBusyHour {
  /** Jam lokal (06–22, termasuk 06.00). */
  hour: number
  /** Jumlah transaksi pada jam tsb (rentang filter). */
  count: number
}

/** Satu baris rekap metode bayar — padanan `GET /reports/payment-methods`. */
export interface MockPaymentBreakdownRow {
  methodName: string
  /** 'cash' | 'non_cash' — mengikuti PaymentType di settings-mocks. */
  type: 'cash' | 'non_cash'
  /** Jumlah transaksi pakai metode tsb. */
  count: number
  /** Total nilai transaksi (IDR). */
  total: number
}

/** Daftar kandidat produk laporan (12 produk F&B seed 2A.3, +2 variasi). */
const REPORT_PRODUCTS: ReadonlyArray<{
  name: string
  category: string
  variants: ReadonlyArray<{ name: string; price: number }>
}> = [
  {
    name: 'Ayam Geprek Original',
    category: 'Makanan',
    variants: [
      { name: 'S', price: 16_000 },
      { name: 'M', price: 18_000 },
      { name: 'L', price: 20_000 },
    ],
  },
  {
    name: 'Ayam Geprek Keju',
    category: 'Makanan',
    variants: [
      { name: 'M', price: 23_000 },
      { name: 'L', price: 25_000 },
    ],
  },
  {
    name: 'Paket Geprek Nasi + Es Teh',
    category: 'Paket',
    variants: [
      { name: 'Reguler', price: 22_000 },
      { name: 'Jumbo', price: 26_000 },
    ],
  },
  {
    name: 'Paket Nasi Ayam + Es Jeruk',
    category: 'Paket',
    variants: [{ name: 'Reguler', price: 25_000 }],
  },
  {
    name: 'Nasi Putih',
    category: 'Makanan',
    variants: [{ name: 'Porsi', price: 5_000 }],
  },
  {
    name: 'Lele Goreng Sambal',
    category: 'Makanan',
    variants: [
      { name: '1 ekor', price: 15_000 },
      { name: '2 ekor', price: 27_000 },
    ],
  },
  {
    name: 'Tahu Crispy',
    category: 'Snack',
    variants: [
      { name: '5 pcs', price: 8_000 },
      { name: '10 pcs', price: 15_000 },
    ],
  },
  {
    name: 'Kulit Ayam Crispy',
    category: 'Snack',
    variants: [{ name: '5 pcs', price: 10_000 }],
  },
  {
    name: 'Pisang Goreng Keju',
    category: 'Snack',
    variants: [{ name: '3 pcs', price: 9_000 }],
  },
  {
    name: 'Es Teh Manis',
    category: 'Minuman',
    variants: [
      { name: 'Reguler', price: 4_000 },
      { name: 'Jumbo', price: 6_000 },
    ],
  },
  {
    name: 'Es Jeruk Peras',
    category: 'Minuman',
    variants: [
      { name: 'Reguler', price: 8_000 },
      { name: 'Jumbo', price: 11_000 },
    ],
  },
  {
    name: 'Air Mineral',
    category: 'Minuman',
    variants: [{ name: 'Botol 600ml', price: 5_000 }],
  },
]

/**
 * Best seller top 10 + produk sepi — deterministik per outlet.
 * Qty tiap varian = base (dari seed outlet) × weight varian × weight hari.
 * Varian populer (es teh, ayam geprek, nasi putih) dapat weight besar, jadi
 * urutan antar outlet mirip tapi tidak identik. `bottom` memuat 3 produk
 * paling sepi (qty terkecil) untuk badge "Produk sepi".
 */
export function buildMockBestSellers(outletId: string): {
  items: MockBestSeller[]
  bottom: MockBestSeller[]
} {
  const rand = mulberry32(hashSeed(`${outletId}:bestsellers`))
  const base = 8 + Math.floor(rand() * 6) // 8–13 unit varian populer/hari
  const popularWeights: Record<string, number> = {
    'Es Teh Manis': 2.2,
    'Ayam Geprek Original': 1.9,
    'Nasi Putih': 1.7,
    'Ayam Geprek Keju': 1.25,
    'Es Jeruk Peras': 1.15,
    'Tahu Crispy': 1.05,
  }

  const rows: MockBestSeller[] = []
  for (const p of REPORT_PRODUCTS) {
    for (const v of p.variants) {
      const weight = (popularWeights[p.name] ?? 0.55) * (0.85 + rand() * 0.5)
      const qty = Math.max(1, Math.round(base * weight))
      rows.push({
        variantName: `${p.name} — ${v.name}`,
        productName: p.name,
        qty,
        omzet: qty * v.price,
      })
    }
  }

  rows.sort((a, b) => b.qty - a.qty || b.omzet - a.omzet)
  return {
    items: rows.slice(0, 10),
    bottom: rows.slice(-3).reverse(),
  }
}

/** Jam buka laporan — 06.00 s/d 22.00 (PRD §10.9). */
export const BUSY_HOURS_RANGE = { from: 6, to: 22 } as const

/**
 * Jam ramai (count transaksi per jam 06–22) — deterministik.
 * Bentuk lonjakan mengikuti profil outlet: jam makan siang (12) + sore (18)
 * selalu ramai; besaran & urutan antar jam dari seed outlet.
 */
export function buildMockBusyHours(outletId: string): MockBusyHour[] {
  const rand = mulberry32(hashSeed(`${outletId}:busyhours`))
  const peakFactor = 0.75 + rand() * 0.5 // 0.75–1.25 → skala per outlet
  const hours: MockBusyHour[] = []
  for (let h = BUSY_HOURS_RANGE.from; h <= BUSY_HOURS_RANGE.to; h++) {
    const lunch = Math.max(0, 1 - Math.abs(h - 12) / 3) // puncak 12:00
    const dinner = Math.max(0, 1 - Math.abs(h - 18) / 3) // puncak 18:00
    const base = Math.max(lunch, dinner)
    const count = Math.max(1, Math.round((base * 34 + rand() * 6) * peakFactor))
    hours.push({ hour: h, count })
  }
  return hours
}

/** Nama & tipe metode bayar mock — konsisten dgn seed settings-mocks. */
const REPORT_PAYMENT_METHODS: ReadonlyArray<{ name: string; type: 'cash' | 'non_cash' }> = [
  { name: 'Cash', type: 'cash' },
  { name: 'QRIS', type: 'non_cash' },
  { name: 'Transfer Bank', type: 'non_cash' },
]

/**
 * Rekap per metode bayar — deterministik. Share metode dari seed outlet
 * (Cash 40–55%, QRIS 30–45%, sisanya Transfer), total menyesuaikan omzet
 * rata-rata harian outlet agar konsisten dengan summary dashboard.
 */
export function buildMockPaymentBreakdown(outletId: string): MockPaymentBreakdownRow[] {
  const rand = mulberry32(hashSeed(`${outletId}:paybreakdown`))
  const cashShare = 0.4 + rand() * 0.15
  const qrisShare = 0.3 + rand() * 0.15
  const transferShare = Math.max(0.05, 1 - cashShare - qrisShare)

  const avgDaily = buildMockDays(outletId, 1)[0].omzet
  const total = Math.round(avgDaily * 6.2) // ~rentang 7 hari

  const shares: Record<string, number> = {
    Cash: cashShare,
    QRIS: qrisShare,
    'Transfer Bank': transferShare,
  }

  const rows: MockPaymentBreakdownRow[] = REPORT_PAYMENT_METHODS.map((m) => {
    const share = shares[m.name] ?? 0
    const count = Math.max(1, Math.round((total / 32_000) * share))
    return {
      methodName: m.name,
      type: m.type,
      count,
      total: Math.round((total * share) / 1000) * 1000,
    }
  })

  // Bulatkan total agar sum(row.total) ≈ total laporan.
  const diff = total - rows.reduce((s, r) => s + r.total, 0)
  rows[0].total = Math.max(0, rows[0].total + diff)
  return rows
}

/* ------------------------------------------------------------------ */
/* Fase 2A.6 — Shifts (mock): riwayat buka/tutup shift                */
/* ------------------------------------------------------------------ */

/** Satu baris rekap metode bayar dalam sebuah shift. */
export interface MockShiftPaymentRow {
  methodName: string
  type: 'cash' | 'non_cash'
  /** Jumlah transaksi pakai metode tsb pada shift. */
  count: number
  /** Total nilai transaksi (IDR). */
  total: number
}

/**
 * Satu shift — padanan row `shifts` di packages/db + agregat per shift
 * dari `shift_payment_breakdown` (kontrak `GET /shifts` Fase 3).
 */
export interface MockShift {
  id: string
  outletId: string
  /** YYYY-MM-DD (waktu lokal outlet). */
  date: string
  cashierName: string
  /** Waktu buka shift (ISO lokal). */
  openedAt: string
  /** Waktu tutup shift (ISO lokal) — null selama shift masih open. */
  closedAt: string | null
  status: 'open' | 'closed'
  /** Kas awal di laci saat buka. */
  openingCash: number
  /** Kas masuk dari transaksi tunai (cash in). */
  cashIn: number
  /** Total transaksi void (dikembalikan dari kas). */
  voidAmount: number
  /** Kas yang seharusnya ada: openingCash + cashIn − voidAmount. */
  expectedCash: number
  /** Kas aktual saat tutup — null selama shift masih open. */
  actualCash: number | null
  /** Selisih actual − expected — null selama shift masih open. */
  difference: number | null
  /** Jumlah transaksi selesai pada shift. */
  txCount: number
  /** Rekap per metode bayar (Cash/QRIS/Transfer). */
  paymentBreakdown: MockShiftPaymentRow[]
}

const SHIFT_CASHIERS = ['Sari', 'Budi', 'Rina', 'Dimas'] as const

/** Format Date lokal → ISO tanpa zona (deterministik antar browser). */
function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  )
}

/**
 * Riwayat shift 14 hari — deterministik per outlet dan konsisten dengan
 * ringkasan omzet harian (buildMockDays), jadi angka shift masuk akal
 * dibanding kartu omzet dashboard. Tiap hari 1 shift: hari ini berstatus
 * `open` (kas aktual belum dihitung, progress ~50–90%), hari sebelumnya
 * `closed` dengan selisih kecil (±, sebagian pas). Kasir bergilir
 * deterministik dari seed outlet.
 */
export function buildMockShifts(outletId: string, count = 14): MockShift[] {
  const rand = mulberry32(hashSeed(`${outletId}:shifts`))
  const days = buildMockDays(outletId, count)
  const firstCashier = Math.floor(rand() * SHIFT_CASHIERS.length)

  return days.map((day, i) => {
    const date = new Date(`${day.date}T00:00:00`)
    const isToday = i === days.length - 1
    const cashierName = SHIFT_CASHIERS[(firstCashier + i) % SHIFT_CASHIERS.length]

    // Jam buka 08:00–10:30, tutup 20:30–22:30 (kelipatan 10 menit).
    const openHour = 8 + Math.floor(rand() * 3)
    const openMinute = Math.floor((rand() * 60) / 10) * 10
    const closeHour = 20 + Math.floor(rand() * 3)
    const closeMinute = Math.floor((rand() * 60) / 10) * 10

    const openedAtDate = new Date(date)
    openedAtDate.setHours(openHour, openMinute, 0, 0)
    const closedAtDate = new Date(date)
    closedAtDate.setHours(closeHour, closeMinute, 0, 0)

    // Shift hari ini baru berjalan ~50–90% dari total harian.
    const progress = isToday ? 0.5 + rand() * 0.4 : 1

    // Share metode bayar per shift (Cash/QRIS/Transfer) — dari seed outlet.
    const cashShare = 0.42 + rand() * 0.14
    const qrisShare = 0.3 + rand() * 0.14

    const cashTotal = Math.round((day.omzet * cashShare * progress) / 1000) * 1000
    const qrisTotal = Math.round((day.omzet * qrisShare * progress) / 1000) * 1000
    const transferTotal = Math.max(0, Math.round(day.omzet * progress) - cashTotal - qrisTotal)

    const txCount = Math.max(1, Math.round(day.txCount * progress))
    const avgTicket = day.avg || 1

    const openingCash = Math.round((150_000 + rand() * 350_000) / 50_000) * 50_000
    const voidAmount = Math.round(day.omzet * progress * (0.004 + rand() * 0.022))
    const expectedCash = openingCash + cashTotal - voidAmount

    // Selisih: 55% kas lebih (hijau), 45% kas kurang (merah), ~20% pas.
    const isOver = rand() < 0.55
    const diffAbs = rand() < 0.2 ? 0 : 5_000 + rand() * 30_000
    const difference = Math.round(diffAbs / 1000) * 1000 * (isOver ? 1 : -1)

    const paymentBreakdown: MockShiftPaymentRow[] = [
      {
        methodName: 'Cash',
        type: 'cash',
        count: Math.max(1, Math.round(cashTotal / avgTicket)),
        total: cashTotal,
      },
      {
        methodName: 'QRIS',
        type: 'non_cash',
        count: Math.max(1, Math.round(qrisTotal / avgTicket)),
        total: qrisTotal,
      },
      {
        methodName: 'Transfer Bank',
        type: 'non_cash',
        count: Math.max(1, Math.round(transferTotal / avgTicket)),
        total: transferTotal,
      },
    ]

    return {
      id: `shift-${outletId.slice(0, 8)}-${day.date}`,
      outletId,
      date: day.date,
      cashierName,
      openedAt: toLocalIso(openedAtDate),
      closedAt: isToday ? null : toLocalIso(closedAtDate),
      status: isToday ? 'open' : 'closed',
      openingCash,
      cashIn: cashTotal,
      voidAmount,
      expectedCash,
      actualCash: isToday ? null : expectedCash + difference,
      difference: isToday ? null : difference,
      txCount,
      paymentBreakdown,
    }
  })
}

/** Helper UUID v4 (crypto.randomUUID bila ada, fallback Math.random). */
function cryptoRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** API mock — seluruh fetch dashboard & produk (Fase 2) diarahkan ke sini. */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ------------------------------------------------------------------ */
/* Fase 2A.3 — Produk & Varian (mock CRUD, TANPA API)                 */
/* ------------------------------------------------------------------ */

/** Satu varian produk (bentuk row `product_variants` di packages/db). */
export interface MockProductVariant {
  id: string
  name: string
  sellPrice: number
  stock: number
  lowStockThreshold: number
}

/** Satu produk (bentuk row `products` + nested `product_variants`). */
export interface MockProduct {
  id: string
  outletId: string
  name: string
  category: string
  costPrice: number
  variants: MockProductVariant[]
  createdAt: string
  updatedAt: string
}

/** Filter list produk — padanan query params `GET /products` Fase 3. */
export interface MockProductFilter {
  outletId: string
  category?: string
  search?: string
}

export type StockStatus = 'aman' | 'menipis' | 'habis'

const PRODUCT_STORAGE_KEY = 'larispos_mock_products_v1'

const nowIso = () => new Date().toISOString()

interface SeedVariant {
  name: string
  sellPrice: number
  stock: number
  /** Nilai threshold default (tidak semua varian diberi nilai unik). */
  lowStockThreshold?: number
}

interface SeedProduct {
  name: string
  category: string
  costPrice: number
  variants: SeedVariant[]
}

/** Menghitung total stok sebuah varian (untuk badge produk). */
export function productTotalStock(product: MockProduct): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0)
}

/** Status stok varian: habis bila 0, menipis bila <= threshold, selain itu aman. */
export function variantStockStatus(v: MockProductVariant): StockStatus {
  if (v.stock <= 0) return 'habis'
  if (v.stock <= v.lowStockThreshold) return 'menipis'
  return 'aman'
}

/**
 * Seed 12 produk F&B (kategori Makanan/Minuman/Snack/Paket/Umum).
 * Tiap produk punya 1–3 varian dengan harga & stok berbeda; sebagian stok
 * 0 / menipis agar badge stok & kartu "stok menipis" punya data.
 */
export function buildSeedProducts(outletId: string): MockProduct[] {
  const seeded: SeedProduct[] = [
    {
      name: 'Ayam Geprek Original',
      category: 'Makanan',
      costPrice: 11_000,
      variants: [
        { name: 'S', sellPrice: 16_000, stock: 18 },
        { name: 'M', sellPrice: 18_000, stock: 4, lowStockThreshold: 5 },
        { name: 'L', sellPrice: 20_000, stock: 0, lowStockThreshold: 5 },
      ],
    },
    {
      name: 'Ayam Geprek Keju',
      category: 'Makanan',
      costPrice: 14_000,
      variants: [
        { name: 'M', sellPrice: 23_000, stock: 12 },
        { name: 'L', sellPrice: 25_000, stock: 6 },
      ],
    },
    {
      name: 'Paket Geprek Nasi + Es Teh',
      category: 'Paket',
      costPrice: 14_500,
      variants: [
        { name: 'Reguler', sellPrice: 22_000, stock: 9 },
        { name: 'Jumbo', sellPrice: 26_000, stock: 3, lowStockThreshold: 5 },
      ],
    },
    {
      name: 'Paket Nasi Ayam + Es Jeruk',
      category: 'Paket',
      costPrice: 16_000,
      variants: [{ name: 'Reguler', sellPrice: 25_000, stock: 7 }],
    },
    {
      name: 'Nasi Putih',
      category: 'Makanan',
      costPrice: 3_000,
      variants: [{ name: 'Porsi', sellPrice: 5_000, stock: 60 }],
    },
    {
      name: 'Lele Goreng Sambal',
      category: 'Makanan',
      costPrice: 9_000,
      variants: [
        { name: '1 ekor', sellPrice: 15_000, stock: 10 },
        { name: '2 ekor', sellPrice: 27_000, stock: 5 },
      ],
    },
    {
      name: 'Tahu Crispy',
      category: 'Snack',
      costPrice: 4_000,
      variants: [
        { name: '5 pcs', sellPrice: 8_000, stock: 20 },
        { name: '10 pcs', sellPrice: 15_000, stock: 2, lowStockThreshold: 5 },
      ],
    },
    {
      name: 'Kulit Ayam Crispy',
      category: 'Snack',
      costPrice: 6_000,
      variants: [{ name: '5 pcs', sellPrice: 10_000, stock: 0, lowStockThreshold: 5 }],
    },
    {
      name: 'Pisang Goreng Keju',
      category: 'Snack',
      costPrice: 5_000,
      variants: [{ name: '3 pcs', sellPrice: 9_000, stock: 15 }],
    },
    {
      name: 'Es Teh Manis',
      category: 'Minuman',
      costPrice: 1_500,
      variants: [
        { name: 'Reguler', sellPrice: 4_000, stock: 40 },
        { name: 'Jumbo', sellPrice: 6_000, stock: 12 },
      ],
    },
    {
      name: 'Es Jeruk Peras',
      category: 'Minuman',
      costPrice: 4_000,
      variants: [
        { name: 'Reguler', sellPrice: 8_000, stock: 5 },
        { name: 'Jumbo', sellPrice: 11_000, stock: 0, lowStockThreshold: 5 },
      ],
    },
    {
      name: 'Air Mineral',
      category: 'Minuman',
      costPrice: 2_000,
      variants: [{ name: 'Botol 600ml', sellPrice: 5_000, stock: 48 }],
    },
  ]

  return seeded.map((p, i) => ({
    id: `seed-${outletId.slice(0, 8)}-${String(i + 1).padStart(2, '0')}`,
    outletId,
    name: p.name,
    category: p.category,
    costPrice: p.costPrice,
    variants: p.variants.map((v, j) => ({
      id: `seed-${outletId.slice(0, 8)}-${String(i + 1).padStart(2, '0')}-v${j + 1}`,
      name: v.name,
      sellPrice: v.sellPrice,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    })),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))
}

/** Simpan daftar produk ke localStorage (key versi — v1). */
export function persistProducts(products: MockProduct[]): void {
  try {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products))
  } catch {
    // Kuota penuh / private mode — abaikan, state in-memory tetap jalan.
  }
}

/** Baca daftar produk dari localStorage; null bila belum pernah disimpan. */
export function loadProductsFromStorage(): MockProduct[] | null {
  try {
    const raw = localStorage.getItem(PRODUCT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed as MockProduct[]
  } catch {
    return null
  }
}

/** Migrasi data tersimpan ke bentuk sekarang (pada 2A.3 versi pertama = passthrough). */
export function migrateProducts(p: MockProduct[]): MockProduct[] {
  return p
}

/** Snapshot semua produk yang baru di-seed — untuk tombol "Reset". */
export function seedSnapshot(): MockProduct[] {
  return MOCK_OUTLETS.flatMap((o) => buildSeedProducts(o.id))
}

/**
 * Penyimpanan produk mock (state module-level + persist localStorage).
 * Api mock berikut meniru kontrak Fase 3 (`GET/POST /products`, `PATCH`,
 * `DELETE /products/:id`) — nanti tinggal ganti body query/mutation ke Eden.
 */
let productDb: MockProduct[] | null = null

function getProductDb(): MockProduct[] {
  if (productDb) return productDb
  const stored = loadProductsFromStorage()
  productDb = stored && stored.length > 0 ? migrateProducts(stored) : seedSnapshot()
  return productDb
}

function writeProductDb(next: MockProduct[]): MockProduct[] {
  productDb = next
  persistProducts(next)
  return next
}

function normalizeProduct(p: MockProduct): MockProduct {
  return {
    ...p,
    category: p.category || 'Umum',
    costPrice: typeof p.costPrice === 'number' ? p.costPrice : 0,
    variants: Array.isArray(p.variants) ? p.variants : [],
  }
}

/** Buat produk baru (validasi Zod tetap di lapisan query/form). */
export function createMockProduct(input: CreateProductInput): MockProduct {
  const now = nowIso()
  const product: MockProduct = normalizeProduct({
    id: cryptoRandomUUID(),
    outletId: input.outletId,
    name: input.name,
    category: input.category ?? 'Umum',
    costPrice: input.costPrice,
    variants: input.variants.map((v) => ({
      id: cryptoRandomUUID(),
      name: v.name,
      sellPrice: v.sellPrice,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    })),
    createdAt: now,
    updatedAt: now,
  })
  writeProductDb([product, ...getProductDb()])
  return product
}

/** Update nama/kategori/HPP/varian sebuah produk (validasi di query/form). */
export function updateMockProduct(id: string, input: UpdateProductInput): MockProduct {
  const db = getProductDb()
  const idx = db.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Produk tidak ditemukan.')
  const current = db[idx]
  const updated: MockProduct = normalizeProduct({
    ...current,
    name: input.name ?? current.name,
    category: input.category ?? current.category,
    costPrice: input.costPrice ?? current.costPrice,
    variants: input.variants
      ? input.variants.map((v) => {
          // Pertahankan id varian yang sudah ada (via id bila dikirim, atau
          // cocokkan nama) — varian baru diberi UUID baru.
          const existing = v.id
            ? current.variants.find((pv) => pv.id === v.id)
            : current.variants.find((pv) => pv.name === v.name)
          return {
            id: existing?.id ?? cryptoRandomUUID(),
            name: v.name,
            sellPrice: v.sellPrice,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
          }
        })
      : current.variants,
    updatedAt: nowIso(),
  })
  const next = [...db]
  next[idx] = updated
  writeProductDb(next)
  return updated
}

/** Hapus produk beserta variannya. */
export function deleteMockProduct(id: string): void {
  const db = getProductDb()
  if (!db.some((p) => p.id === id)) throw new Error('Produk tidak ditemukan.')
  writeProductDb(db.filter((p) => p.id !== id))
}

/** Kembalikan katalog ke seed awal 12 produk per outlet. */
export function resetMockProducts(): MockProduct[] {
  return writeProductDb(seedSnapshot())
}

/**
 * List produk dengan filter (padanan `GET /products?outletId=&category=&search=`).
 * Search mencocokkan nama produk maupun nama varian (case-insensitive).
 */
export function listMockProducts(filter: MockProductFilter): MockProduct[] {
  const { outletId, category, search } = filter
  const q = search?.trim().toLowerCase() ?? ''
  return getProductDb().filter((p) => {
    if (p.outletId !== outletId) return false
    if (category && category !== 'Semua' && p.category !== category) return false
    if (q) {
      const inName = p.name.toLowerCase().includes(q)
      const inVariant = p.variants.some((v) => v.name.toLowerCase().includes(q))
      if (!inName && !inVariant) return false
    }
    return true
  })
}

export const mockApi = {
  /**
   * GET /reports/summary — ringkasan per hari dalam rentang [from, to].
   * Selalu mengembalikan 7 hari penuh: kartu statistik "hari ini" tetap butuh
   * baris hari ini meski filter rentang tidak mencakupnya. Pemfilteran
   * rentang dilakukan di komponen (sama seperti perilaku API asli Fase 3
   * yang tetap menyediakan ringkasan hari ini di payload).
   */
  async summary(outletId: string): Promise<MockDashboardData> {
    await sleep(300)
    return { outletId, days: buildMockDays(outletId) }
  },

  /** GET /reports/low-stock — varian dengan stock <= lowStockThreshold. */
  async lowStock(outletId: string): Promise<MockLowStockVariant[]> {
    await sleep(300)
    return buildMockLowStock(outletId)
  },

  /** GET /reports/best-sellers — top 10 + produk sepi (rentang diabaikan di mock). */
  async bestSellers(outletId: string): Promise<ReturnType<typeof buildMockBestSellers>> {
    await sleep(300)
    return buildMockBestSellers(outletId)
  },

  /** GET /reports/busy-hours — count transaksi per jam 06–22. */
  async busyHours(outletId: string): Promise<MockBusyHour[]> {
    await sleep(300)
    return buildMockBusyHours(outletId)
  },

  /** GET /reports/payment-methods — rekap per metode bayar. */
  async paymentBreakdown(outletId: string): Promise<MockPaymentBreakdownRow[]> {
    await sleep(300)
    return buildMockPaymentBreakdown(outletId)
  },

  /* ---- Produk (Fase 2A.3) ---- */

  /** GET /products?outletId=&category=&search= */
  async listProducts(filter: MockProductFilter): Promise<MockProduct[]> {
    await sleep(300)
    return listMockProducts(filter)
  },

  /** POST /products — body `CreateProductInput` (Zod shared). */
  async createProduct(input: CreateProductInput): Promise<MockProduct> {
    await sleep(350)
    return createMockProduct(input)
  },

  /** PATCH /products/:id — body `UpdateProductInput`. */
  async updateProduct(id: string, input: UpdateProductInput): Promise<MockProduct> {
    await sleep(350)
    return updateMockProduct(id, input)
  },

  /** DELETE /products/:id */
  async deleteProduct(id: string): Promise<{ id: string }> {
    await sleep(300)
    deleteMockProduct(id)
    return { id }
  },

  /** POST /products/reset — kembalikan katalog ke seed 12 produk/outlet. */
  async resetProducts(): Promise<MockProduct[]> {
    await sleep(250)
    return resetMockProducts()
  },

  /* ---- Shifts (Fase 2A.6) ---- */

  /** GET /shifts?outletId= — riwayat shift 14 hari per outlet. */
  async shifts(outletId: string): Promise<MockShift[]> {
    await sleep(300)
    return buildMockShifts(outletId)
  },
}
