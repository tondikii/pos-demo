# Design System Master File — LarisPOS

> Single source of truth untuk SEMUA platform (web dashboard, mobile kasir, landing).
> Baca file ini sebelum membangun UI apa pun. Page overrides: `pages/[page].md`.

---

## Brand & Tone

- **Produk:** POS untuk UMKM F&B Indonesia. Tone: ramah, tepercaya, efisien.
- **Font:** Plus Jakarta Sans (sudah dipakai web; mobile pakai system font fallback dengan weight yang sama).
- **Copywriting:** bahasa Indonesia natural — skill `pos-copywriting`.

## Color Palette (Final)

| Role | Hex | Penggunaan |
|------|-----|------------|
| Primary | `#2563EB` | Aksi utama web (button, link, focus) |
| Primary Pressed | `#1D4ED8` | Hover/pressed primary |
| Primary Soft | `#EFF6FF` | Background chip/selected |
| Accent/CTA | `#EA580C` | CTA landing & highlight harga |
| Success | `#16A34A` | Aksi positif kasir (Bayar, Buka Shift) |
| Success Soft | `#F0FDF4` | Badge sukses |
| Warning | `#B45309` | Status offline, printer putus (text/badge fg) |
| Warning Strong | `#9A3412` | Teks warning tegas |
| Warning Icon | `#EA580C` | Ikon status warning |
| Warning Soft | `#FFF7ED` | Background badge warning |
| Warning Border | `#FED7AA` | Border box warning |
| Background | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Card, sidebar, header |
| Text | `#0F172A` | Judul/body utama |
| Text Muted | `#64748B` | Secondary text |
| Border | `#E2E8F0` | Dividers, outline |
| Destructive | `#DC2626` | Error, void, hapus |
| On Primary/Success/Accent | `#FFFFFF` | Teks di atas warna solid |

> **Catatan audit R4:** Token `Warning` (offline/printer) diresmikan — dipakai status
> non-error yang perlu perhatian. Status netral seperti "Dibatalkan" memakai
> Surface/Border/Text-Muted (bukan warna baru). Placeholder input: `#94A3B8`.
> Scrim modal: `rgba(15,23,42,0.5)`. Padding card standar: 16 (lihat Spacing).

## Typography

- Font: Plus Jakarta Sans (weight 400/500/600/700/800).
- Heading: 800 (bold), letter-spacing -0.02em. Body: 400/500.
- Ukuran: h1 24-30, h2 18-22, h3 16-18, body 14, caption 12.
- Angka uang: tabular-nums (rata kanan di tabel).

## Spacing (8px rhythm)

- 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Card padding: **16 (seragam untuk SEMUA kategori card**: grid produk, list row, status box). Section gap: 24-32. Page gutter: 16 (mobile) / 24 (desktop).
- Radius: **card 16, button/input 12, badge/chip full, sheet top 24** — satu nilai per kategori, tanpa pengecualian.

## Typography

- Font: Plus Jakarta Sans (weight 400/500/600/700/800).
- Heading: 800 (bold), letter-spacing -0.02em. Body: 400/500.
- Ukuran: h1 24-30, h2 18-22, h3 16-18, body 14, caption 12.
- Angka uang: tabular-nums (rata kanan di tabel).
- Hierarki list tegas: judul item 14 bold ≥ body 13 ≥ caption 12 muted — selalu ada perbedaan jelas antara judul & metadata.

## Navigation (WAJIB)

- **Web dashboard:** SIDEBAR kiri (desktop, 240px) / drawer (mobile <768px). Item: Dashboard, Kasir, Produk, Laporan, Pengaturan (Outlet, Staf, Metode Bayar, Langganan).
- **Mobile kasir:** BOTTOM NAVIGATION 4 item: Kasir / Riwayat / Shift / Sync.
- **Landing:** top nav sederhana (Logo, Fitur, Harga, FAQ, Login).

## Komponen Kunci

- **Button:** primary (biru, radius 12, padding 10-16), outline, ghost. Height ≥48 (mobile).
- **Card:** surface putih, border 1px `#E2E8F0`, radius 16, padding 16, shadow lembut.
- **Badge:** soft background (primary-soft/success-soft/destructive-soft/warning-soft/neutral) + teks warna solid, radius full.
- **StatCard:** label caption muted, value 24-28 bold, delta up (hijau) / down (merah).
- **Table:** header muted 12 semibold, row border-bottom, hover surfaceMuted.
- **Modal:** scrim `rgba(15,23,42,0.5)`, panel radius 16, padding 24.
- **Toast:** success (hijau soft), error (merah soft), slide-in bottom.

## Motion (skill pos-motion)

- Hover: translateY(-1..-4px) + shadow, 150-250ms.
- Entrance: fade+up 8-20px, 300-500ms, stagger ≤60ms/item, max 8 item.
- Reduced motion: skip semua (final state).

## Anti-Pattern

- Emoji sebagai ikon (pakai SVG).
- Top navbar untuk dashboard (harus sidebar).
- Header nav untuk mobile kasir (harus bottom nav).
- Form dengan field tidak wajib di step wajib.
- Jargon Inggris di teks user-facing.
