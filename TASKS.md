# TASKS.md — LarisPOS Implementation Breakdown

> Turunan dari `PRD.md` + `ARCHITECTURE.md` + `AGENTS.md`. Dibagi **Fase**, bukan list datar. Setiap fase punya **STOP — review checkpoint** sebelum lanjut.

---

## Fase 1 — Foundation

> Scaffold monorepo, shared types/schema, DB schema & infra setup. Belum ada business logic maupun UI.

- [ ] 1.1 Inisialisasi monorepo: `package.json` (Bun workspaces), `turbo.json` (pipeline build/lint/typecheck/test), `.env.example`, `.gitignore`. Struktur `apps/web, apps/mobile, apps/backend, apps/landing` + `packages/shared, packages/db`.
- [ ] 1.2 Setup `packages/shared`: Zod schemas awal (`auth`, `outlet`, `product`+`product_variant`, `payment_method`, `transaction`, `shift`, `subscription`), TS types, `constants` (plans, roles, subscription statuses), `eden treaty` client helper.
- [ ] 1.3 Setup `packages/db`: Drizzle `schema.ts` (users, outlets, staff, products, product_variants, payment_methods, shifts, transactions, transaction_items, subscriptions, subscription_history), `drizzle.config.ts`, relasi + indexes (`idx_variant_product`, `idx_tx_outlet_created`, `idx_tx_offline`), `seed.ts` (owner demo + 1 outlet + sample products).
- [ ] 1.4 Migrasi awal: `bun run db:generate` + `bun run db:migrate` lokal, verifikasi schema Postgres (Neon/Supabase atau local Docker).
- [ ] 1.5 Scaffold `apps/backend` (Elysia on Bun): `src/index.ts` (CORS, helmet, pino, prefix `/api/v1`), plugin `error` (`{ error: { code, message } }`), health check `GET /health`.
- [ ] 1.6 Scaffold `apps/web` (SolidStart 1.x + Tailwind + TanStack Query): routing skeleton `(auth)/login|register`, `(app)/dashboard` placeholder, env `VITE_API_URL`, auth middleware stub.
- [ ] 1.7 Scaffold `apps/mobile` (Expo SDK 52 + Expo Router + NativeWind): `(auth)/login` PIN placeholder, `(app)/pos` placeholder, `expo-sqlite` + `expo-secure-store` + `react-native-ble-plx` deps terpasang, `NetInfo` listener stub.
- [ ] 1.8 Scaffold `apps/landing` (Astro 5 + Tailwind): `Layout.astro` (SEO: title/meta/OG), `index.astro` skeleton (Hero/Fitur/Harga/FAQ sections kosong), `astro-sitemap` + `astro-robots-txt` config.
- [ ] 1.9 Tooling & CI: ESLint + Prettier per workspace, `tsconfig` strict, `vitest` config per workspace, GitHub Actions (install bun, `turbo run build`, `turbo run typecheck`, `drizzle migrate` dry-run).
- [ ] 1.10 Verifikasi Fase 1: `bun install` bersih, `turbo run build` + `turbo run typecheck` hijau, `bun run test` pass (smoke), `drizzle-kit` generate tanpa diff, masing-masing `dev` command jalan (web, mobile, backend, landing).

> **STOP — Review Checkpoint Fase 1**
> Jangan lanjut sebelum: monorepo scaffold review, shared schemas + DB schema disetujui, tiap app bisa `dev` tanpa error, CI hijau. Demo: `GET /health` backend, skeleton pages web/landing/mobile.

---

## Fase 2 — Frontend (Mock Data)

> Semua UI/screen sesuai user flows di PRD, pakai **mock/dummy data lokal**, belum connect ke API asli. Fase ini bisa review via browser/device.

### Fase 2A — Web Dashboard (Mock)

- [ ] 2A.1 Auth UI (web): halaman `login`, `register`, `onboarding outlet pertama` (form + validasi Zod dari `packages/shared`), layout auth, state mock (tanpa API).
- [ ] 2A.2 Dashboard ringkasan (mock): omzet hari ini, laba, jumlah transaksi, kartu peringatan stok menipis, filter tanggal/outlet (mock data 7 hari).
- [ ] 2A.3 Produk & Varian (mock CRUD): list produk, kategori filter, modal create/edit produk + varian (S/M/L) + stok per varian, low-stock threshold, validasi Zod, dummy 12 produk F&B.
- [ ] 2A.4 Outlet, Staff & Payment Methods (mock CRUD): list outlet, form pajak/layanan % per outlet, staff list + buat PIN 6-digit, payment methods (Cash/QRIS/Transfer) CRUD.
- [ ] 2A.5 Laporan (mock): summary (omzet/HPP/laba), best sellers top 10, jam ramai (bar 06–22), rekap per metode bayar, stok menipis, filter tanggal + outlet.
- [ ] 2A.6 Shifts & Langganan (mock): riwayat shift (buka/tutup), detail shift (kas awal/akhir/selisih), halaman langganan (3 paket + sisa trial + CTA).
- [ ] 2A.7 Polish web: responsive, empty states, loading skeletons, error states, TanStack Query mock provider, akses via `ui-ux-pro-max` skill untuk visual check.

### Fase 2B — Mobile Kasir (Mock)

- [ ] 2B.1 Login PIN (mock): numpad 6-digit, pilih outlet (jika mock multi), validasi mock, session MMKV/SecureStore stub.
- [ ] 2B.2 Kasir Cepat (mock): grid produk dari SQLite cache mock, pilih varian, keranjang (qty +/-, hapus), subtotal + pajak/layanan mock, pilih metode bayar, hitung kembalian cash.
- [ ] 2B.3 Buka/Tutup Shift (mock): form kas awal, rekap shift berjalan, form tutup (kas aktual + selisih), riwayat shift lokal mock.
- [ ] 2B.4 Void & History (mock): riwayat transaksi, void dengan alasan, stok kembali (mock decrement/restore).
- [ ] 2B.5 Offline & Sync UI (mock): badge "Menunggu sync", antrean `queued_transactions` list mock, tombol "Sync sekarang", simulasi online/offline toggle.
- [ ] 2B.6 Cetak Struk (mock): pair printer mock, preview struk 58mm, tombol Cetak + Share fallback, cetak ulang dari History.
- [ ] 2B.7 Polish mobile: NativeWind styling, loading/empty states, lock PIN 5x, akses via `ui-ux-pro-max` untuk review kasir flow.

### Fase 2C — Landing Page (Mock Content)

- [ ] 2C.1 Hero + value prop ("Harga Warung, Fitur Laris") + CTA "Coba Gratis 14 Hari" → `/register` web.
- [ ] 2C.2 Sections: Fitur (kasir cepat, offline, laporan), Harga (Starter 39k / Tumbuh 89k / Jaringan custom), Testimoni dummy, FAQ accordion.
- [ ] 2C.3 SEO & perf: JSON-LD `Product` + `FAQPage`, OG image, heading hierarchy, sitemap, `astro:assets` image, Lighthouse ≥95 target (mock content).
- [ ] 2C.4 Verifikasi Fase 2: tiap user flow di PRD §9 (Onboarding, Kelola Harian, Kasir Cepat, Void, Laporan, Langganan) bisa di-tap end-to-end via mock; reviewer-agent pass untuk UI; `typecheck` + `lint` hijau.

> **STOP — Review Checkpoint Fase 2**
> Jangan lanjut sebelum: semua screen web/mobile/landing bisa di-review via mock (tanpa backend), flows PRD ter-cover visual, UX kasir <15 detik mock, SEO landing skeleton indexable. Approval UX sebelum wiring.

---

## Fase 3 — Backend & Wiring

> API endpoints, business logic, validasi sesuai shared schema dari Fase 1. Lalu **wiring**: ganti mock Frontend dengan koneksi ke API asli.

### Fase 3A — Backend API

- [ ] 3A.1 Auth: `POST /auth/register` (buat user+outlet+subscription trial 14d), `POST /auth/login` (JWT access 15m + refresh 7d), `POST /auth/cashier-login` (PIN bcrypt, JWT `role:cashier`), `POST /auth/refresh`, rate limit 5/menit/IP, tests Zod + bcrypt.
- [ ] 3A.2 `auth` plugin + `roleGuard` + `subscriptionGuard` (trialing|active untuk transaksi/shift), multi-tenant `ownerId`/`outletId` scoping, error shape `{ error: { code, message } }`.
- [ ] 3A.3 Outlets + Staff: `GET/POST /outlets` (cap maxOutlets per plan), `PATCH /outlets/:id` (pajak/layanan, receipt header/footer), `GET/POST /staff` (PIN), tests outlet limit 403.
- [ ] 3A.4 Products & Variants: `GET/POST /products` (nested variants), `PATCH /products/:id`, `PATCH /product-variants/:id` (stok), stok per varian, index `idx_variant_product`, tests validasi Zod.
- [ ] 3A.5 Payment Methods: `GET/POST /payment-methods`, `PATCH /payment-methods/:id`, minimal 1 aktif, Cash default via seed.
- [ ] 3A.6 Transactions: `POST /transactions` (idempotent `offlineId` unique, `SELECT ... FOR UPDATE` + decrement, 409 `INSUFFICIENT_STOCK`), `GET /transactions`, `POST /transactions/:id/void` (reason, restore stock), tests double-submit + conflict.
- [ ] 3A.7 Shifts: `POST /shifts/open` (1 open/shift/outlet/staff), `POST /shifts/:id/close` (expected/actual/difference), `GET /shifts`, auto-close 03:00 job.
- [ ] 3A.8 Reports: `GET /reports/summary`, `GET /reports/best-sellers`, `GET /reports/busy-hours`, `GET /reports/payment-methods`, `GET /reports/low-stock` — semua pakai index `(outletId, createdAt)`, filter tanggal + outlet.
- [ ] 3A.9 Subscriptions & Midtrans: `POST /subscriptions/checkout` (Snap token), `GET /subscriptions/me`, `POST /webhooks/midtrans` (SHA512 verify), cron grace `past_due→dormant→frozen`, tests webhook signature.
- [ ] 3A.10 Export: `GET /reports/export?format=pdf|xlsx` (pdf-lib/exceljs via backend stream).
- [ ] 3A.11 Seed + docs: `db:seed` (owner + variants + methods + shifts + tx sample), OpenAPI via Eden, `GET /health` enriched.

### Fase 3B — Wiring Frontend → API Asli

- [ ] 3B.1 Ganti mock auth web/mobile dengan Eden Treaty typed client + JWT (cookie httpOnly web, SecureStore mobile), TanStack Query cache, auth guard real.
- [ ] 3B.2 Wiring web: dashboard, produk/varian, outlet/staff/payment-methods, laporan, shifts, langganan — hapus mock data, loading/error states real, outlet cap 403 handling.
- [ ] 3B.3 Wiring mobile: login PIN real, produk cache `expo-sqlite` dari `GET /products`, keranjang → `POST /transactions` dengan `offlineId`, void real, shift open/close real.
- [ ] 3B.4 Offline sync real (skill `pos-offline-sync`): `queued_transactions` SQLite + `NetInfo` FIFO + retry 3x (2s/4s/8s) + 409 `failed` + manual sync, verified dengan airplane mode test.
- [ ] 3B.5 Print real (skill `pos-print`): `react-native-ble-plx` ESC/POS 58mm + Share fallback, cetak real dari transaksi & rekap shift.
- [ ] 3B.6 Landing wiring: CTA real ke `app.larispos.id/register`, harga dari `packages/shared` constants (single source), webhook deploy notif.
- [ ] 3B.7 Verifikasi Fase 3: semua flows PRD end-to-end via API real (register → outlet → produk → transaksi → void → shift → laporan → subscription), `typecheck`+`lint`+`test` hijau, `reviewer-agent` pass.

> **STOP — Review Checkpoint Fase 3**
> Jangan lanjut sebelum: API contract sesuai `ARCHITECTURE.md` §6, stok locking & idempotency verified (double-submit test), Midtrans sandbox settlement → `active`, offline queue real test (airplane mode), mobile bisa transaksi + cetak (atau Share fallback).

---

## Fase 4 — Testing & Polish

> E2E tests untuk user flows utama dari PRD, hardening, dan finalisasi rilis.

- [ ] 4.1 Unit & integration (Vitest): Zod schemas (`packages/shared`), `FOR UPDATE` stock (409), `offlineId` idempotency (double-submit → single row), `subscriptionGuard` (402 when not trialing|active), `webhook` SHA512 (reject bad signature).
- [ ] 4.2 Mobile offline tests (Vitest + Expo Jest): queue FIFO, retry backoff, 409 → `failed` + notif, product cache upsert, ` queued_transactions` survives restart.
- [ ] 4.3 E2E (Playwright + `playwright-cli` skill) — **wajib cover flows PRD §9**:
  - [ ] 4.3a Web E2E: register → trial banner → create product+variant → create staff PIN → outlet tax/service → subscription checkout (Midtrans mock) → laporan filters (summary/best-sellers/busy-hours).
  - [ ] 4.3b POS loop (via API + mobile harness): open shift → transaksi multi-varian → void → close shift (actual vs expected) → export PDF/XLSX.
  - [ ] 4.3c Landing E2E: hero CTA, harga 3 paket, FAQ, SEO (title/meta/JSON-LD/sitemap), Lighthouse ≥95.
- [ ] 4.4 Midtrans sandbox end-to-end: Snap popup → settlement webhook → `subscriptions.status=active` → outlet capable transaksi (automated where possible, manual step terdokumentasi).
- [ ] 4.5 Polish & akses: `ui-ux-pro-max` review untuk web + mobile + landing, a11y (keyboard, aria), responsive, empty/loading/error states final.
- [ ] 4.6 Security & perf: bcrypt PIN, rate limit, CORS (`app.larispos.id` + `larispos.id`), pino + Sentry smoke, report query latency <300ms untuk 10k transaksi (index check), `turbo run typecheck && turbo run lint && bun run test` hijau.
- [ ] 4.7 Rilis checklist: `AGENTS.md` workflow git diikuti, `.env` tidak ter-commit, `drizzle migrate` di Neon staging, Fly.io + Cloudflare Pages deploy dry-run, changelog.

> **STOP — Review Checkpoint Fase 4 (Final)**
> Jangan rilis sebelum: semua E2E hijau, PRD Acceptance Criteria §10.1–10.11 tercentang, laporan profit (omzet−HPP) akurat vs fixture, Midtrans webhook verified, reviewer-agent final pass.

---

## Cara Pakai

- Mulai dari Fase 1 → per task centang `[x]` saat selesai.
- Setiap **STOP** = pause untuk review manual oleh user sebelum lanjut.
- Jika scope perlu di-adjust (misal skip export), edit di PRD dulu lalu sync kembali ke sini.
