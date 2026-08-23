# Final Kurasi — Landing Page (Astro)

**Jumlah final: 6 gambar** — rentang 4–8 terpenuhi; dipilih karena tiap section menampilkan kemampuan berbeda dan bisa berdiri sendiri tanpa konteks dashboard/mobile.

> Catatan capture: folder awal `portfolio-captures/landing/` kosong saat mulai sesi, jadi dilakukan capture ulang penuh. Capture awal beberapa section blank (ukuran <5KB untuk cta/testimoni) karena animasi `pos-motion` (`html.js .motion-hidden {opacity:0}` + `inView` reveal) belum ter-trigger — diperbaiki dengan `reducedMotion: reduce` + scroll to bottom sebelum screenshot, sehingga semua section kini render penuh (cta 56K, testimoni 66K, fitur 90K, harga 138K).

## Urutan Naratif (scroll flow calon klien)

| # | File | Alasan dipilih (1 kalimat, kaitkan kriteria) |
|---|------|-----------------------------------------------|
| 1 | `01-hero.png` | Menceritakan alur produk dalam 3 detik: value prop "Harga Warung, Fitur Laris" + badge Rp 39rb + 2 CTA + bullets tanpa kartu kredit — langsung dipahami orang awam tanpa konteks platform lain. |
| 2 | `02-fitur.png` | Variasi vs hero: menampilkan 6 kartu fitur (kasir <15s, offline-first, laporan laba, stok per varian, multi-outlet, printer) dengan ikon SVG — membuktikan kelengkapan tanpa duplikasi list+tabel. |
| 3 | `03-harga.png` | Relevan sebagai showcase layanan tunggal landing saja: 3 pricing cards (Starter/Tumbuh/Jaringan, highlighted PALING LARIS, fitur list, hemat 17%) meyakinkan klien yang hanya butuh landing pricing tanpa lihat dashboard. |
| 4 | `04-testimoni.png` | Kualitas visual + kepercayaan: 3 testimoni Kopi Senja sinkron `demo.ts` (Rina/Andi/Budi) dengan quote italic dan divider — social proof yang tidak butuh penjelasan teknis. |
| 5 | `05-faq.png` | Kompleksitas teknis nyata: 8 FAQ accordion native `<details name="faq">` dengan JSON-LD `FAQPage` (SEO) — menunjukkan implementasi SEO-friendly tanpa JS. |
| 6 | `06-cta.png` | Menutup alur naratif dengan conversion: banner CTA "Mulai Jualan Hari Ini" + tombol Coba Gratis — standalone dan tidak mengandalkan konteks dashboard. |

## Dipertimbangkan tapi Tidak Dipilih

- `full-desktop.png` (524K) & `full-mobile.png` (455K) & `_tmp_full.png` — fullPage panjang: visual kurang terbaca di thumbnail portfolio dan tidak ada detail yang tidak sudah terwakil di 6 crops; dipakai internal QA saja.
- `viewport-*.png` (6 file, 56–138K) — viewport crop dengan padding halaman: duplikasi dengan element screenshot `*.png` tapi menyertakan header/footer berlebih, kurang fokus vs crop elemen yang lebih tajam.
- `hero` versi mobile viewport — relevansi rendah untuk listing layanan landing desktop-first; sudah tercover di `full-mobile.png` jika klien minta proof responsive.

## Kriteria yang Dipakai (ringkas per platform)

Kompleksitas teknis, storytelling 3 detik, variasi, keunggulan PRD (tidak relevan untuk landing tapi harga murah tetap pembeda), kualitas render (tidak ada layout shift, data mock wajar), showcase mandiri.
