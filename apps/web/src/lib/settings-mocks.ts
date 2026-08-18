import { MOCK_OUTLETS, MOCK_OUTLET_IDS } from './mocks'
import {
  PLANS,
  createOutletSchema,
  createStaffSchema,
  resetStaffPinSchema,
  createPaymentMethodSchema,
} from '@larispos/shared'
import type {
  CreateOutletInput,
  UpdateOutletInput,
  CreateStaffInput,
  UpdateStaffInput,
  ResetStaffPinInput,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from '@larispos/shared'

/**
 * Mock settings Fase 2A.4 — Outlet, Staff & Payment Methods (TANPA API).
 *
 * Semua CRUD berjalan di module-level state + persist localStorage (per
 * storage key). Bentuk row mengikuti tabel DB di packages/db (outlets,
 * staff, payment_methods) sehingga Fase 3 tinggal mengganti body query/
 * mutation ke Eden Treaty.
 *
 * Aturan bisnis (guard) yang dijaga di lapisan ini:
 *  - Outlet: batas `maxOutlets` sesuai plan (Starter = 1). Outlet demo
 *    (seed deterministik) TIDAK dihitung sebagai outlet milik user — hanya
 *    outlet sesi (onboarding) + outlet yang dibuat lewat halaman ini.
 *  - Payment method: minimal 1 aktif per outlet; Cash (default seed) tidak
 *    bisa dinonaktifkan bila itu satu-satunya metode aktif.
 */

/* ------------------------------------------------------------------ */
/* Helper UUID v4 (crypto.randomUUID bila ada, fallback Math.random)   */
/* ------------------------------------------------------------------ */

function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/* ------------------------------------------------------------------ */
/* Outlet                                                              */
/* ------------------------------------------------------------------ */

export interface MockSettingsOutlet {
  id: string
  name: string
  address: string
  phone?: string
  taxPercent: number
  servicePercent: number
  receiptHeader?: string
  receiptFooter?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Patch dari updateOutletSchema (partial) — seluruh field opsional. */
export type PatchOutletInput = UpdateOutletInput

const OUTLETS_STORAGE_KEY = 'larispos_mock_outlets_v1'

const nowIso = () => new Date().toISOString()

/** Outlet demo deterministik (dari mocks.ts) dijadikan row settings. */
function seedOutlets(): MockSettingsOutlet[] {
  return MOCK_OUTLETS.map((o) => ({
    id: o.id,
    name: o.name,
    address: o.address,
    phone: undefined,
    taxPercent: 0,
    servicePercent: 0,
    receiptHeader: undefined,
    receiptFooter: undefined,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))
}

function persistOutlets(list: MockSettingsOutlet[]): void {
  try {
    localStorage.setItem(OUTLETS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Kuota penuh / private mode — abaikan, state in-memory tetap jalan.
  }
}

function loadOutlets(): MockSettingsOutlet[] {
  try {
    const raw = localStorage.getItem(OUTLETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Sanitasi: buang row basi (id non-UUID yang bukan demo) — id valid selalu
    // UUID v4 (demo: UUID; sesi/baru: UUID dari auth/mock). Ini membersihkan
    // data lama dari auth-mock versi id pendek (`out_xxx`).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return (parsed as MockSettingsOutlet[]).filter(
      (o) => MOCK_OUTLET_IDS.includes(o.id) || UUID_RE.test(o.id),
    )
  } catch {
    return []
  }
}

let outletDb: MockSettingsOutlet[] | null = null

function getOutletDb(): MockSettingsOutlet[] {
  if (outletDb) return outletDb
  const stored = loadOutlets()
  // Tidak ada data tersimpan (atau storage kosong) → seed outlet demo.
  outletDb = stored.length > 0 ? stored : seedOutlets()
  return outletDb
}

function writeOutletDb(next: MockSettingsOutlet[]): MockSettingsOutlet[] {
  outletDb = next
  persistOutlets(next)
  return next
}

function normalizeOutlet(o: MockSettingsOutlet): MockSettingsOutlet {
  return {
    ...o,
    name: typeof o.name === 'string' ? o.name : '',
    address: typeof o.address === 'string' ? o.address : '',
    taxPercent: typeof o.taxPercent === 'number' ? o.taxPercent : 0,
    servicePercent: typeof o.servicePercent === 'number' ? o.servicePercent : 0,
    isActive: o.isActive !== false,
  }
}

/** Outlet sesi (auth mock) — bentuknya sama dengan row settings. */
export interface MockSessionOutlet {
  id: string
  name: string
  address: string
  phone?: string
  taxPercent?: number
  servicePercent?: number
  receiptHeader?: string
  receiptFooter?: string
  isActive?: boolean
  createdAt: string
}

/**
 * Masukkan outlet sesi (auth mock) ke DB outlet bila belum ada — supaya
 * seluruh CRUD (update/toggle) bekerja seragam pada satu sumber data.
 * Dipanggil tiap list/limit agar konsisten setelah login.
 */
function syncSessionOutlet(session: MockSessionOutlet | null): void {
  if (!session) return
  const db = getOutletDb()
  if (db.some((o) => o.id === session.id)) return
  const ts = nowIso()
  writeOutletDb([
    {
      id: session.id,
      name: session.name,
      address: session.address,
      phone: session.phone,
      taxPercent: session.taxPercent ?? 0,
      servicePercent: session.servicePercent ?? 0,
      receiptHeader: session.receiptHeader,
      receiptFooter: session.receiptFooter,
      isActive: session.isActive !== false,
      createdAt: session.createdAt || ts,
      updatedAt: ts,
    },
    ...db,
  ])
}

/** Outlet yang dibuat lewat halaman ini (bukan seed demo). */
function ownedMockOutlets(db: MockSettingsOutlet[]): MockSettingsOutlet[] {
  return db.filter((o) => !MOCK_OUTLET_IDS.includes(o.id))
}

export interface OutletLimitStatus {
  max: number
  /** Jumlah outlet milik user (sesi + yang dibuat via halaman ini). */
  used: number
  reached: boolean
}

/**
 * Status batas outlet sesuai plan (PLANS.starter.maxOutlets = 1 di mock).
 * Outlet demo (contoh deterministik) tidak dihitung sebagai milik user.
 */
export function outletLimitStatus(session: MockSessionOutlet | null): OutletLimitStatus {
  syncSessionOutlet(session)
  const max = PLANS.starter.maxOutlets
  const used = ownedMockOutlets(getOutletDb()).length
  return { max, used, reached: used >= max }
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export interface MockStaff {
  id: string
  outletId: string
  name: string
  /** Mock hash PIN (bukan plaintext). Hanya untuk Fase 2 — Fase 3 ganti bcrypt. */
  pinHash: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateStaffMockInput extends CreateStaffInput {}
export interface UpdateStaffMockInput extends UpdateStaffInput {}
export interface ResetStaffPinMockInput extends ResetStaffPinInput {}

const STAFF_STORAGE_KEY = 'larispos_mock_staff_v1'

/** Hash PIN mock (tidak reversible — cukup untuk demo, Fase 3 ganti bcrypt). */
export function hashMockPin(pin: string): string {
  let h = 2166136261
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `mock$${h.toString(36)}`
}

function persistStaff(list: MockStaff[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // abaikan
  }
}

function loadStaff(): MockStaff[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as MockStaff[]
  } catch {
    return []
  }
}

let staffDb: MockStaff[] | null = null

function getStaffDb(): MockStaff[] {
  if (staffDb) return staffDb
  const stored = loadStaff()
  staffDb = stored
  return staffDb
}

function writeStaffDb(next: MockStaff[]): MockStaff[] {
  staffDb = next
  persistStaff(next)
  return next
}

function normalizeStaff(s: MockStaff): MockStaff {
  return {
    ...s,
    name: typeof s.name === 'string' ? s.name : '',
    pinHash: typeof s.pinHash === 'string' ? s.pinHash : '',
    isActive: s.isActive !== false,
  }
}

/** PIN unik per outlet — cegah dua staff dengan PIN sama di outlet sama. */
export function isPinTaken(
  staffList: MockStaff[],
  outletId: string,
  pin: string,
  exceptId?: string,
): boolean {
  const hash = hashMockPin(pin)
  return staffList.some(
    (s) => s.outletId === outletId && s.pinHash === hash && s.id !== exceptId,
  )
}

/* ------------------------------------------------------------------ */
/* Payment Methods                                                     */
/* ------------------------------------------------------------------ */

export type PaymentType = 'cash' | 'non_cash'

export interface MockPaymentMethod {
  id: string
  outletId: string
  name: string
  type: PaymentType
  instruction?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentMethodMockInput extends CreatePaymentMethodInput {}
export interface UpdatePaymentMethodMockInput extends UpdatePaymentMethodInput {}

const PAYMENT_STORAGE_KEY = 'larispos_mock_payment_methods_v1'

/** Seed metode bayar per outlet demo: Cash (default, aktif) + QRIS + Transfer. */
function seedPaymentMethods(): MockPaymentMethod[] {
  const list: MockPaymentMethod[] = []
  for (const outletId of MOCK_OUTLET_IDS) {
    const ts = nowIso()
    list.push(
      {
        id: newUuid(),
        outletId,
        name: 'Cash',
        type: 'cash',
        instruction: 'Bayar tunai di kasir.',
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: newUuid(),
        outletId,
        name: 'QRIS',
        type: 'non_cash',
        instruction: 'Scan QRIS — semua e-wallet & m-banking.',
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: newUuid(),
        outletId,
        name: 'Transfer Bank',
        type: 'non_cash',
        instruction: 'Transfer ke rekening outlet.',
        isActive: false,
        createdAt: ts,
        updatedAt: ts,
      },
    )
  }
  return list
}

function persistPaymentMethods(list: MockPaymentMethod[]): void {
  try {
    localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // abaikan
  }
}

function loadPaymentMethods(): MockPaymentMethod[] {
  try {
    const raw = localStorage.getItem(PAYMENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as MockPaymentMethod[]
  } catch {
    return []
  }
}

let paymentDb: MockPaymentMethod[] | null = null

function getPaymentDb(): MockPaymentMethod[] {
  if (paymentDb) return paymentDb
  const stored = loadPaymentMethods()
  paymentDb = stored.length > 0 ? stored : seedPaymentMethods()
  return paymentDb
}

function writePaymentDb(next: MockPaymentMethod[]): MockPaymentMethod[] {
  paymentDb = next
  persistPaymentMethods(next)
  return next
}

function normalizePaymentMethod(p: MockPaymentMethod): MockPaymentMethod {
  return {
    ...p,
    name: typeof p.name === 'string' ? p.name : '',
    type: p.type === 'cash' ? 'cash' : 'non_cash',
    isActive: p.isActive !== false,
  }
}

/** Metode Cash (default) sebuah outlet — seed otomatis bila belum ada. */
function getOrCreateCash(outletId: string): MockPaymentMethod {
  const db = getPaymentDb()
  const existing = db.find((p) => p.outletId === outletId && p.type === 'cash')
  if (existing) return existing
  const ts = nowIso()
  const cash: MockPaymentMethod = {
    id: newUuid(),
    outletId,
    name: 'Cash',
    type: 'cash',
    instruction: 'Bayar tunai di kasir.',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }
  writePaymentDb([cash, ...db])
  return cash
}

/* ------------------------------------------------------------------ */
/* Public mock functions (sync)                                        */
/* ------------------------------------------------------------------ */

/** List outlet (demo + sesi + buatan user), urut: aktif dulu, lalu dibuat. */
export function listMockOutlets(session: MockSessionOutlet | null): MockSettingsOutlet[] {
  syncSessionOutlet(session)
  const list = getOutletDb()
  return [...list].sort((a, b) =>
    a.isActive === b.isActive ? a.createdAt.localeCompare(b.createdAt) : a.isActive ? -1 : 1,
  )
}

export function createMockOutlet(input: CreateOutletInput): MockSettingsOutlet {
  createOutletSchema.parse(input)
  const ts = nowIso()
  const row: MockSettingsOutlet = normalizeOutlet({
    id: newUuid(),
    name: input.name,
    address: input.address,
    phone: input.phone,
    taxPercent: input.taxPercent ?? 0,
    servicePercent: input.servicePercent ?? 0,
    receiptHeader: input.receiptHeader,
    receiptFooter: input.receiptFooter,
    isActive: input.isActive !== false,
    createdAt: ts,
    updatedAt: ts,
  })
  writeOutletDb([row, ...getOutletDb()])
  return row
}

export function updateMockOutlet(id: string, input: PatchOutletInput): MockSettingsOutlet {
  const db = getOutletDb()
  const idx = db.findIndex((o) => o.id === id)
  if (idx === -1) throw new Error('Outlet tidak ditemukan.')
  const current = db[idx]
  const updated: MockSettingsOutlet = normalizeOutlet({
    ...current,
    name: input.name ?? current.name,
    address: input.address ?? current.address,
    phone: input.phone !== undefined ? input.phone : current.phone,
    taxPercent: input.taxPercent ?? current.taxPercent,
    servicePercent: input.servicePercent ?? current.servicePercent,
    receiptHeader: input.receiptHeader !== undefined ? input.receiptHeader : current.receiptHeader,
    receiptFooter: input.receiptFooter !== undefined ? input.receiptFooter : current.receiptFooter,
    isActive: input.isActive ?? current.isActive,
    updatedAt: nowIso(),
  })
  const next = [...db]
  next[idx] = updated
  writeOutletDb(next)
  return updated
}

/** Toggle isActive outlet — tidak bisa menonaktifkan outlet terakhir yang aktif. */
export function toggleMockOutletActive(id: string): MockSettingsOutlet {
  const db = getOutletDb()
  const target = db.find((o) => o.id === id)
  if (!target) throw new Error('Outlet tidak ditemukan.')
  if (target.isActive && db.filter((o) => o.isActive).length <= 1) {
    throw new Error('Minimal satu outlet harus aktif.')
  }
  return updateMockOutlet(id, { isActive: !target.isActive })
}

/** List staff (semua outlet, atau satu outlet bila `outletId` diisi). */
export function listMockStaff(outletId: string | null): MockStaff[] {
  const list = getStaffDb().filter((s) => (outletId ? s.outletId === outletId : true))
  return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function createMockStaff(input: CreateStaffMockInput): MockStaff {
  createStaffSchema.parse(input)
  const db = getStaffDb()
  if (isPinTaken(db, input.outletId, input.pin)) {
    throw new Error('PIN sudah dipakai staff lain di outlet ini. Pilih PIN lain.')
  }
  const ts = nowIso()
  const row: MockStaff = normalizeStaff({
    id: newUuid(),
    outletId: input.outletId,
    name: input.name,
    pinHash: hashMockPin(input.pin),
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  })
  writeStaffDb([row, ...db])
  return row
}

export function updateMockStaff(id: string, input: UpdateStaffMockInput): MockStaff {
  const db = getStaffDb()
  const idx = db.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error('Staff tidak ditemukan.')
  const current = db[idx]
  const updated: MockStaff = normalizeStaff({
    ...current,
    name: input.name ?? current.name,
    isActive: input.isActive ?? current.isActive,
    updatedAt: nowIso(),
  })
  const next = [...db]
  next[idx] = updated
  writeStaffDb(next)
  return updated
}

/** Reset PIN staff — validasi 6 digit; tidak boleh sama dengan staff lain. */
export function resetMockStaffPin(id: string, input: ResetStaffPinMockInput): MockStaff {
  resetStaffPinSchema.parse(input)
  const db = getStaffDb()
  const idx = db.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error('Staff tidak ditemukan.')
  const current = db[idx]
  if (isPinTaken(db, current.outletId, input.pin, id)) {
    throw new Error('PIN sudah dipakai staff lain di outlet ini. Pilih PIN lain.')
  }
  const updated: MockStaff = normalizeStaff({
    ...current,
    pinHash: hashMockPin(input.pin),
    updatedAt: nowIso(),
  })
  const next = [...db]
  next[idx] = updated
  writeStaffDb(next)
  return updated
}

/** List metode bayar outlet (seed otomatis untuk outlet sesi yang baru). */
export function listMockPaymentMethods(outletId: string): MockPaymentMethod[] {
  getOrCreateCash(outletId)
  const list = getPaymentDb().filter((p) => p.outletId === outletId)
  return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function createMockPaymentMethod(input: CreatePaymentMethodMockInput): MockPaymentMethod {
  createPaymentMethodSchema.parse(input)
  const ts = nowIso()
  const row: MockPaymentMethod = normalizePaymentMethod({
    id: newUuid(),
    outletId: input.outletId,
    name: input.name,
    type: input.type,
    instruction: input.instruction,
    isActive: input.isActive !== false,
    createdAt: ts,
    updatedAt: ts,
  })
  writePaymentDb([row, ...getPaymentDb()])
  return row
}

export function updateMockPaymentMethod(
  id: string,
  input: UpdatePaymentMethodMockInput,
): MockPaymentMethod {
  const db = getPaymentDb()
  const idx = db.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Metode bayar tidak ditemukan.')
  const current = db[idx]
  const updated: MockPaymentMethod = normalizePaymentMethod({
    ...current,
    name: input.name ?? current.name,
    type: input.type ?? current.type,
    instruction: input.instruction !== undefined ? input.instruction : current.instruction,
    isActive: input.isActive ?? current.isActive,
    updatedAt: nowIso(),
  })
  const next = [...db]
  next[idx] = updated
  writePaymentDb(next)
  return updated
}

/**
 * Toggle aktif metode bayar dengan guard:
 *  - minimal 1 metode aktif per outlet;
 *  - Cash (metode cash default) tidak bisa dinonaktifkan bila itu satu-satunya
 *    metode aktif di outlet.
 */
export function toggleMockPaymentMethodActive(id: string): MockPaymentMethod {
  const db = getPaymentDb()
  const target = db.find((p) => p.id === id)
  if (!target) throw new Error('Metode bayar tidak ditemukan.')
  const outletMethods = db.filter((p) => p.outletId === target.outletId)
  const activeCount = outletMethods.filter((p) => p.isActive).length

  if (target.isActive && activeCount <= 1) {
    throw new Error('Minimal satu metode bayar harus aktif di outlet ini.')
  }
  return updateMockPaymentMethod(id, { isActive: !target.isActive })
}

/** Kembalikan settings ke seed awal (outlet demo + metode bayar seed, staff kosong). */
export function resetMockSettings(): {
  outlets: MockSettingsOutlet[]
  staff: MockStaff[]
  paymentMethods: MockPaymentMethod[]
} {
  writeOutletDb(seedOutlets())
  writeStaffDb([])
  writePaymentDb(seedPaymentMethods())
  return {
    outlets: getOutletDb(),
    staff: getStaffDb(),
    paymentMethods: getPaymentDb(),
  }
}

/* ------------------------------------------------------------------ */
/* API mock (async) — padanan kontrak Fase 3                          */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const settingsMockApi = {
  async listOutlets(session: MockSessionOutlet | null): Promise<MockSettingsOutlet[]> {
    await sleep(300)
    return listMockOutlets(session)
  },
  async createOutlet(input: CreateOutletInput): Promise<MockSettingsOutlet> {
    await sleep(350)
    return createMockOutlet(input)
  },
  async updateOutlet(id: string, input: PatchOutletInput): Promise<MockSettingsOutlet> {
    await sleep(350)
    return updateMockOutlet(id, input)
  },
  async toggleOutletActive(id: string): Promise<MockSettingsOutlet> {
    await sleep(300)
    return toggleMockOutletActive(id)
  },
  async listStaff(outletId: string | null): Promise<MockStaff[]> {
    await sleep(300)
    return listMockStaff(outletId)
  },
  async createStaff(input: CreateStaffMockInput): Promise<MockStaff> {
    await sleep(350)
    return createMockStaff(input)
  },
  async updateStaff(id: string, input: UpdateStaffMockInput): Promise<MockStaff> {
    await sleep(350)
    return updateMockStaff(id, input)
  },
  async resetStaffPin(id: string, input: ResetStaffPinMockInput): Promise<MockStaff> {
    await sleep(350)
    return resetMockStaffPin(id, input)
  },
  async listPaymentMethods(outletId: string): Promise<MockPaymentMethod[]> {
    await sleep(300)
    return listMockPaymentMethods(outletId)
  },
  async createPaymentMethod(input: CreatePaymentMethodMockInput): Promise<MockPaymentMethod> {
    await sleep(350)
    return createMockPaymentMethod(input)
  },
  async updatePaymentMethod(
    id: string,
    input: UpdatePaymentMethodMockInput,
  ): Promise<MockPaymentMethod> {
    await sleep(350)
    return updateMockPaymentMethod(id, input)
  },
  async togglePaymentMethodActive(id: string): Promise<MockPaymentMethod> {
    await sleep(300)
    return toggleMockPaymentMethodActive(id)
  },
  async resetSettings(): Promise<void> {
    await sleep(250)
    resetMockSettings()
  },
}
