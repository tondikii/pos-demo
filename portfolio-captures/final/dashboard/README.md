# Final Kurasi — Web Dashboard (SolidJS)

**Jumlah final: 7 gambar** — rentang 4–8 terpenuhi; dipilih independen dari landing/mobile, berdasarkan kekuatan kandidat dashboard sendiri (tidak dipaksa 6-6-6).

> Source: `portfolio-captures/dashboard/` awal kosong, capture ulang via Playwright dengan login mock (prefill `owner@kopisenja.test` / `kopisenja123` → klik Masuk → dashboard). Semua halaman pakai data mock deterministik dari `@larispos/shared/demo.ts` (Kopi Senja, 13 produk, 3 outlet).

## Urutan Naratif (owner journey: intisari → pembeda → operasional → admin)

| # | File | Alasan dipilih (1 kalimat, kaitkan kriteria) |
|---|------|-----------------------------------------------|
| 1 | `01-dashboard.png` | Kompleksitas teknis nyata + kualitas visual: 3 StatCard (omzet/laba/transaksi + delta vs kemarin & margin), OmzetChart 7 hari, LowStockCard 3–4 varian, rincian harian tabel omzet−HPP=laba — langsung paham kinerja usaha dalam 3 detik. |
| 2 | `02-laporan.png` | Mewakili keunggulan PRD §1–2 (pembeda vs kompetitor): best sellers top 10, jam ramai bar 06–22, rekap per metode bayar, stok menipis — insight actionable bukan tabel polos. |
| 3 | `03-produk.png` | Variasi vs laporan: grid produk per varian (stok per varian, badge menipis/habis untuk Kopi Susu Gula Aren/V60/Croissant), kategori filter, foto Unsplash — bukti stok per varian akurat F&B. |
| 4 | `04-kasir.png` | Menceritakan alur produk standalone: halaman Kasir web menampilkan status shift hari ini (open) + 5 shift terakhir tanpa redundancy — entry point kasir di dashboard. |
| 5 | `05-shifts.png` | Kompleksitas teknis nyata: riwayat 14 hari dengan kas awal + cash masuk − void = expected, actual, selisih ±, breakdown per metode — data yang dipakai tutup kas harian. |
| 6 | `06-staf.png` | Relevan showcase layanan dashboard saja: manajemen staf per outlet dengan PIN 6-digit (bcrypt di backend) — menunjukkan role guard owner vs cashier tanpa butuh konteks mobile. |
| 7 | `07-langganan.png` | Menutup alur admin: 3 paket (Starter 39k / Tumbuh 89k / Jaringan custom) dengan sisa trial badge & CTA Midtrans — bukti monetisasi siap jual. |

## Dipertimbangkan tapi Tidak Dipilih

- `_tmp_login.png` (134K) & `_tmp_register.png` (152K) — layar login/register: kurang berbobot vs kasir terisi (kriteria "kompleksitas teknis nyata"), dan untuk listing dashboard saja login adalah layar transisi bukan pembeda.
- `_tmp_outlets.png` (59K) — outlet form (pajak 11%, receipt header/footer): duplikasi pola list+tabel dengan `05-staf` & `_tmp_payment`; dipilih `05-staf` yang lebih representatif karena menampilkan PIN kasir (keamanan) vs config outlet yang generik.
- `_tmp_payment.png` (63K) — metode bayar Cash/QRIS/Transfer: duplikasi dengan staf/outlets (CRUD list), kurang storytelling dibanding laporan yang sudah cover rekap per metode bayar.
- `_tmp_categories.png` (67K) — kategori produk: duplikasi dengan `03-produk` yang sudah menampilkan chip kategori + counts.
- `outlets` tidak dipilih bukan karena tidak penting, tapi satu representatif CRUD cukup untuk variasi (kriteria "variasi, bukan duplikasi").

## Kriteria yang Dipakai

Kompleksitas nyata > tampilan statis, storytelling 3 detik, variasi (hindari 2 list+tabel sama), keunggulan laporan PRD, kualitas render (data mock wajar, tidak ada 0 semua / Lorem ipsum), standalone untuk klien yang hanya butuh dashboard.
