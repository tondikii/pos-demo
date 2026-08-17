# AGENTS.md — LarisPOS Operating Instructions

> Instruksi operasional untuk AI coding agent. Baca file ini di setiap sesi kerja. Jangan ulang narasi arsitektur — hanya aturan actionable. Rujukan lengkap: `PRD.md` & `ARCHITECTURE.md`.

---

## 1. Wajib Baca Sebelum Coding

1. `PRD.md` — scope MVP, user flows, acceptance criteria.
2. `ARCHITECTURE.md` — stack, schema, API contract, offline strategy.
3. Jangan putuskan hal yang sudah diputuskan di kedua dokumen di atas.

---

## 2. Stack Ringkas (Jangan Ganti Tanpa Approval)

- **Kebijakan Versi: Selalu gunakan `latest stable` untuk semua packages/dependencies. Jika versi latest belum stable (alpha/beta/canary), pakai latest stable. Jangan pin versi lama tanpa approval.**
- Web: **SolidJS + SolidStart 1.x + TailwindCSS + TanStack Query** (latest stable)
- Mobile: **Expo SDK 52+ + Expo Router + NativeWind + expo-sqlite + MMKV** (latest stable)
- Backend: **Elysia on Bun 1.2+ (Bun runtime)** (latest stable)
- Landing: **Astro 5 + TailwindCSS** (pisah dari web, latest stable)
- DB: **Postgres 16 + Drizzle ORM** (latest stable)
- Shared: `packages/shared` (Zod schemas) + `packages/db` (Drizzle schema)
- Auth: JWT (15m access / 7d refresh) + bcrypt PIN 6-digit kasir
- Payment: Midtrans Snap (langganan saja)
- Hosting: Fly.io (backend) + Neon (DB) + Cloudflare Pages (web/landing)

---

## 3. Monorepo & Package Manager

- **Package manager: `bun` saja** — jangan pakai npm/yarn/pnpm.
- **Monorepo: Bun workspaces + Turborepo.**
- Struktur:
  ```
  apps/web, apps/mobile, apps/backend, apps/landing
  packages/shared, packages/db
  ```
- Aturan import: `packages/shared` & `packages/db` **tidak boleh** import dari `apps/*`. `apps/*` boleh import dari `packages/*`.
- Semua schema/types/konstanta baru taruh di `packages/shared` dulu, baru dipakai di apps.
- Env: duplikasi dari `.env.example` — jangan commit `.env`.

---

## 4. Perintah Wajib

```bash
bun install              # install semua workspace
turbo run dev            # dev semua apps (atau bun --filter web dev)
turbo run build          # build semua
turbo run lint           # lint
turbo run typecheck      # tsc --noEmit per workspace
bun run db:generate      # drizzle-kit generate (dari packages/db)
bun run db:migrate       # drizzle-kit migrate
bun run db:seed          # seed dev data
```

- Backend run: `bun --filter backend dev` (Elysia watch)
- Web run: `bun --filter web dev` (SolidStart)
- Mobile run: `bun --filter mobile start` (expo)
- Landing run: `bun --filter landing dev` (astro)

---

## 5. Konvensi Kode

- **TypeScript strict** di semua workspace. Jangan pakai `any` — pakai `unknown` + Zod parse.
- **Validasi:** Semua input API & form validasi pakai **Zod dari `packages/shared`**. Di Elysia pakai adapter `elysia-zod` / `drizzle-zod`.
- **Drizzle:** Schema di `packages/db/src/schema.ts`. Migrasi via `drizzle-kit` — jangan edit SQL manual.
- **Penamaan:** `camelCase` untuk variabel/fungsi, `PascalCase` untuk komponen/type, `kebab-case` untuk file route.
- **Styling:** TailwindCSS saja — jangan tambah CSS-in-JS lain.
- **Error handling:** Elysia `error` plugin → response `{ error: { code, message } }`. Jangan bocorkan stack ke client.
- **Logging:** `pino` di backend, `console` hanya untuk dev mobile/web.
- **Jangan** tambah dependency baru tanpa cek `ARCHITECTURE.md` — kalau perlu, sebutkan alasan & minta approval.

---

## 6. Backend (Elysia) — Aturan

- Prefix API: `/api/v1`.
- Setiap route pakai Zod schema dari `packages/shared` untuk `body/query/params`.
- Auth: `auth` plugin → `derive` user dari JWT. Guard `roleGuard('owner'|'cashier')` + cek `outletId` milik owner.
- Subscription guard: transaksi & buka shift cek `subscriptions.status` (`trialing|active` boleh, selain itu 402).
- Transaksi `POST /transactions` **wajib** idempotent via `offlineId` (UUID dari mobile) → `ON CONFLICT (offlineId) DO NOTHING`.
- Validasi stok pakai **DB transaction + `SELECT ... FOR UPDATE`** pada `product_variants` — jangan decrement tanpa lock.
- Laporan query pakai index `(outletId, createdAt)` — jangan full scan.
- Webhook Midtrans: verifikasi `SHA512(order_id+status_code+gross_amount+serverKey)` sebelum update status.

---

## 7. Web Dashboard (SolidStart) — Aturan

- Routing file-based di `apps/web/src/routes/`.
- Data fetching pakai **TanStack Query** — jangan fetch manual di komponen tanpa cache.
- Auth guard via SolidStart middleware (cek cookie JWT, redirect `/login`).
- Jangan panggil backend langsung dengan URL hardcode — pakai `eden treaty` client dari `packages/shared` atau `fetch` dengan `import.meta.env.VITE_API_URL`.
- Komponen UI pakai Tailwind + `kobalte` jika perlu headless — jangan bawa MUI/Chakra.

---

## 8. Mobile Kasir (Expo) — Aturan

- Routing via **Expo Router** (`apps/mobile/app/`).
- Offline-first: transaksi simpan ke **expo-sqlite** (`queued_transactions`) dengan `offlineId` UUID. Jangan pakai AsyncStorage untuk antrean.
- Sync: `NetInfo` listener → FIFO, retry 3x exponential (2s/4s/8s). 409 `INSUFFICIENT_STOCK` → tandai `failed` + notif user.
- Produk cache: sync `GET /products` saat online ke SQLite untuk browsing offline.
- Bluetooth: `react-native-ble-plx` + ESC/POS builder manual — fallback `Share.share` jika printer tidak connect.
- Token simpan di `expo-secure-store`, bukan AsyncStorage. MMKV hanya untuk cache non-sensitif.

---

## 9. Landing (Astro) — Aturan

- Static-first — jangan tambah JS interaktif kecuali island perlu.
- SEO: `astro-sitemap`, `astro-robots-txt`, JSON-LD `Product` + `FAQPage`, OG image, heading hierarchy.
- Jangan import logic dari `apps/web` — landing standalone.

---

## 10. Database — Aturan

- Semua tabel: `id UUID PK defaultRandom()`, `createdAt`, `updatedAt`.
- Stok di `product_variants.stock` (per varian) — bukan di `products`.
- Index wajib: `idx_variant_product (productId)`, `idx_tx_outlet_created (outletId, createdAt)`, `idx_tx_offline (offlineId)`.
- Jangan tulis migrasi manual — selalu `bun run db:generate` lalu review SQL.

---

## 11. DO / DON'T

| DO | DON'T |
|---|---|
| Pakai `bun` & `turbo` untuk semua task | Pakai npm/yarn/pnpm |
| Taruh types/schema di `packages/shared` | Duplikasi type di tiap app |
| Validasi semua input dengan Zod | Percaya input client tanpa parse |
| Lock stok dengan `FOR UPDATE` | Decrement stok tanpa transaction |
| Kirim `offlineId` untuk idempotency | Generate ID transaksi di server saja |
| Guard route by `ownerId/outletId` | Query tanpa filter tenant |
| Fallback Share jika printer gagal | Block transaksi karena printer offline |
| Verifikasi webhook Midtrans signature | Update subscription tanpa verifikasi |

---

## 12. Testing

- **Framework: Vitest** untuk unit/integration (semua workspace).
- **E2E: Playwright** untuk web & landing (pakai `playwright-cli` skill).
- Mobile: Vitest + Expo Jest untuk logic offline/sync; E2E manual di device untuk Bluetooth.
- Perintah:
  ```bash
  bun run test          # vitest run
  bun run test:e2e      # playwright test
  ```
- Tulis test untuk: validasi Zod, transaksi stok (409), offline queue, laporan agregasi, webhook signature.
- Jangan skip `typecheck` & `lint` sebelum push.

---

## 13. Keamanan & Hal Penting

- Hash password/PIN pakai **bcrypt 10** — jangan simpan plain.
- Rate limit login 5/menit/IP.
- CORS hanya `app.larispos.id` & `larispos.id`.
- JWT httpOnly cookie untuk web, SecureStore untuk mobile.
- Grace langganan: `past_due` 7 hari → `dormant` 7 hari → `frozen` (read-only).

---

## 14. Workflow Git

- Branch: `main` (deploy), `feat/*`, `fix/*`.
- Commit: `feat: ...`, `fix: ...`, `chore: ...`.
- Sebelum PR: `turbo run typecheck && turbo run lint && bun run test` harus hijau.
- Jangan commit `.env`, `node_modules`, `dist`, `.expo`.

---

*Kalau butuh keputusan yang belum ada di sini, cek `ARCHITECTURE.md` dulu — jangan karang sendiri.*
