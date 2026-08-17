# PRD — Aplikasi POS UMKM F&B (Murah di Bawah Pasar)

> **Fase: 1 — PRD (Product/Business Only)**
> Dokumen ini HANYA berisi level produk/bisnis. Keputusan teknis (stack, arsitektur, library, hosting) TIDAK diputuskan di sini — dicatat sebagai **Open Question untuk ARCHITECTURE.md**.

---

## 1. Ringkasan Eksekutif

Aplikasi POS untuk UMKM F&B Indonesia (warung makan, kedai kopi, gerobak, cloud kitchen, UMKM rumahan) dengan 2 platform: **Web Dashboard** (pemilik) + **Android Kasir** (staf di outlet) + **Landing Page** untuk akuisisi. Fokus MVP: kasir cepat, stok produk jadi, laporan laba rugi & insight operasional yang benar-benar membantu keputusan usaha — dengan harga langganan **jauh di bawah pasar** (target < Rp 50rb/bulan untuk single outlet) namun tetap profit lewat volume & tier multi-outlet.

**Prinsip MVP:** Relevan dengan pasar F&B Indonesia, tidak overkill. Semua yang dibutuhkan untuk jualan harian & evaluasi usaha ter-cover, tanpa fitur enterprise yang bikin rumit (misal manajemen bahan baku resep, meja dine-in, split bill — ditunda post-MVP).

---

## 2. Masalah yang Diselesaikan

1. **POS existing mahal** — Moka, Majoo, iReap dll ~Rp 150–300rb/bulan/outlet, terlalu beban untuk UMKM mikro yang omzet < Rp 20jt/bulan.
2. **Laporan tidak actionable** — Banyak POS hanya kasih omzet total. UMKM butuh tau: laba bersih (omzet - HPP), produk terlaris vs tidak laku, jam ramai, metode bayar dominan, stok menipis — untuk putuskan: tambah stok apa, promo kapan, tutup lebih malam atau tidak.
3. **Operasional ribet di lapangan** — Koneksi internet tidak stabil di banyak lokasi UMKM. Kasir harus tetap bisa jualan offline & cetak struk thermal Bluetooth.
4. **Kelola cabang manual** — UMKM yang sudah punya 2–3 cabang pakai buku terpisah, tidak ada rekap gabungan. Butuh multi-outlet sederhana sejak awal (bukan enterprise multi-gudang).
5. **Setup pembayaran F&B Indonesia** — Butuh metode bayar fleksibel: Cash, QRIS statis (tempel), Transfer, E-Wallet — tanpa payment gateway otomatis di MVP. Diatur owner dari dashboard.

---

## 3. Target User & Persona

### Persona 1 — Ibu Sari, Pemilik Warung Ayam Geprek (Owner)
- 1 outlet, omzet 10–15jt/bulan, 2 karyawan. Pakai HP Android & laptop.
- Kebutuhan: tau laba harian sebenarnya (setelah modal), produk paling laku, stok ayam habis kapan, rekap tutup kas harian yang bisa dipercaya.
- Pain: POS mahal, laporan ribet, karyawan salah hitung.

### Persona 2 — Riko, Kasir Kedai Kopi (Staf)
- Umur 20-an, pakai HP Android outlet. Tidak perlu akses laporan penuh atau setting.
- Kebutuhan: buka aplikasi → langsung jualan → pilih produk/varian → bayar → cetak struk. Cepat (<15 detik/transaksi), tetap jalan saat internet putus.

### Persona 3 — Pak Budi, Owner 2 Cabang Sate
- 2 outlet, ingin lihat perbandingan omzet cabang A vs B dalam satu dashboard.
- Pain: rekap manual di WA/Excel tiap malam.

**Non-target MVP:** Resto fine-dining full dine-in (butuh meja, kitchen display, split bill), retail non-F&B, franchise besar >10 cabang (masuk tier Custom nanti).

---

## 4. Tujuan Bisnis & Metrik Sukses

| Tujuan | Metrik MVP (3 bulan pertama) |
|---|---|
| Validasi harga sangat murah bisa akuisisi volume | ≥ 200 outlet aktif bayar |
| Retensi karena laporan benar-benar dipakai | ≥ 60% owner buka laporan ≥ 3x/minggu |
| Keandalan kasir | ≥ 99% transaksi berhasil meski offline singkat; cetak struk ≥ 95% berhasil |
| NPS kepuasan | ≥ 40 |
| Churn bulanan | < 8% |

---

## 5. Ruang Lingkup MVP vs Post-MVP

### MVP — Harus Ada
- Auth Owner & Kasir (role Owner + Kasir)
- Outlet management (single di Starter, up to 3 di Tumbuh)
- Produk + varian harga (S/M/L, topping) + stok produk jadi
- Manajemen metode pembayaran (Cash, QRIS statis, Transfer, dll) — di-set dari dashboard
- Pajak & biaya layanan opsional per outlet (%)
- Kasir Android: kasir cepat, keranjang, pilih varian, pilih metode bayar, void/batal, buka/tutup shift/kas, cetak struk Bluetooth thermal, **offline transaksi + sync nanti**
- Laporan lengkap ringan: harian/mingguan/bulanan, laba rugi (omzet - HPP), best seller, stok menipis, metode bayar, jam ramai
- Langganan & trial 14 hari, billing via Midtrans gateway untuk subscription
- Landing page SEO-friendly untuk akuisisi + penjelasan paket

### Post-MVP (Tidak di MVP, masuk backlog)
- Bahan baku & resep (1kg ayam → 10 porsi → HPP otomatis)
- Diskon/promo/voucher, loyalty poin
- Manajemen meja, antrian dapur/KDS, kitchen printer
- Split bill, pindah meja
- Payment gateway untuk transaksi POS (QRIS dinamis)
- Multi-gudang, purchase order supplier
- Laporan akuntansi lengkap (neraca, arus kas)
- iOS app, hardware integrasi (barcode scanner, cash drawer)
- Notifikasi WA otomatis ke owner

---

## 6. Platform (Kebutuhan Produk — Bukan Keputusan Teknis)

- **Web Dashboard:** Untuk Owner — kelola outlet, produk, staf, metode bayar, pajak/layanan, lihat laporan, kelola langganan. Akses via browser desktop/mobile.
- **Android Kasir App:** Hanya Android di MVP. Untuk Kasir & Owner saat jaga toko. Fokus kecepatan & offline.
- **Landing Page:** Untuk akuisisi, SEO, penjelasan fitur, harga, FAQ, CTA daftar trial. Harus SEO-optimal (kecepatan, indexable, meta terstruktur).
  - *Open Question ARCHITECTURE:* Apakah landing page nebeng domain/platform web dashboard atau dipisah (misal subdomain/marketing site) demi SEO & performa — serahkan ke best practice di ARCHITECTURE.

---

## 7. Kandidat Nama Aplikasi (Usulan — Pilih 1)

| Nama | Tagline | Nuansa |
|---|---|---|
| **LarisPOS** | "POS F&B yang Bikin Laris, Harga Warung" | Familiar, mudah diingat UMKM, fokus laris |
| **WarungKasir** | "Kasir Warung Jadi Beres" | Sangat lokal, dekat dengan bahasa UMKM |
| **JualinPOS** | "Jualan Jalan, Laporan Jelas" | Aksi, modern tapi tetap Indonesia |

Rekomendasi: **LarisPOS** — paling brandable, mudah SEO ("POS murah UMKM"), dan scalable ke luar F&B nanti jika mau. Alternatif cadangan: WarungKasir.

*Keputusan final nama: menunggu approval.*

---

## 8. Model Monetisasi & Skema Subscription

**Insight harga pasar (Indonesia 2025–2026):** Moka ~Rp 199–249rb/outlet/bulan, Majoo ~Rp 200–300rb, Pawoon ~Rp 150rb. UMKM mikro anggap ini mahal. Target kita **< Rp 50rb** untuk single outlet = 70–80% lebih murah, kejar volume.

### Skema Rekomendasi (Termurah tapi Tetap Untung Optimal)

| Paket | Outlet | Harga Bulanan | Harga Tahunan (hemat ~17%) | Fitur | Target User |
|---|---|---|---|---|---|
| **Starter** | 1 outlet | **Rp 39.000** | Rp 390.000 | Full fitur MVP: produk varian, stok, laporan lengkap ringan, 2 akun kasir, offline & cetak struk | Warung 1 toko, kedai kopi kecil |
| **Tumbuh** | 2–3 outlet | **Rp 89.000** | Rp 890.000 | Semua Starter + multi-outlet, laporan gabungan & per outlet, 5 akun kasir/outlet | UMKM yang sudah buka cabang |
| **Jaringan (Custom)** | 4+ outlet | **Mulai Rp 149.000 + Rp 25.000/outlet tambahan** | Negosiasi | Semua Tumbuh + prioritas support, onboarding, add-on outlet fleksibel | Jaringan kecil/menengah |

**Trial:** 14 hari gratis full fitur (tanpa kartu), lalu wajib pilih paket untuk lanjut. Data tidak hilang saat trial habis (dormant 7 hari).

**Penagihan MVP:** Subscription via **Midtrans** gateway (Snap/Recurring) — fee ~2% sudah diperhitungkan di margin. Fallback manual transfer jika gateway bermasalah.

**Strategi profit di harga sangat murah:**
- Biaya infra rendah (arsitektur lean), volume tinggi, churn rendah karena value laporan.
- Tahunan dibayar di muka → cashflow + retensi.
- Upsell Tumbuh/Jaringan margin lebih tinggi (multi-outlet willingness to pay lebih tinggi).
- Add-on masa depan (bahan baku, loyalty, KDS) sebagai paket Pro.

**Aturan bisnis langganan:**
- Satu akun Owner bisa punya banyak outlet sesuai paket. Downgrade paket → pilih outlet aktif yang tetap.
- Langganan non-aktif → mode read-only (bisa lihat laporan, tidak bisa transaksi baru) selama 7 hari, lalu freeze.
- Ganti paket prorata (upgrade langsung, downgrade next cycle).

---

## 9. User Flows (Produk Level)

### Flow 1 — Owner Onboarding & Trial
1. Kunjungi landing page → CTA "Coba Gratis 14 Hari" → Daftar (nama, WA, email, nama usaha).
2. Verifikasi → Buat outlet pertama (nama outlet, alamat) → Masuk dashboard (onboarding checklist).
3. Tambah produk + varian + stok + metode bayar + pajak/layanan opsional.
4. Undang kasir (buat akun kasir: nama + PIN 6-digit, assign outlet).
5. Kasir login di Android pakai PIN → siap jualan.

### Flow 2 — Owner Kelola Harian (Web)
Dashboard → Lihat ringkasan hari ini (omzet, laba, transaksi) → Kelola produk/stok → Atur metode bayar/pajak → Lihat laporan → Kelola staf & outlet → Kelola langganan.

### Flow 3 — Kasir Cepat (Android — Offline Capable)
1. Buka app → Login kasir via PIN (atau owner via email/password) → Pilih outlet (jika multi) → **Buka Shift** (input kas awal).
2. Kasir cepat: Tap produk → Pilih varian → Qty → Keranjang → Pilih metode bayar (Cash/QRIS statis/Transfer) → Input uang diterima (jika cash) → **Bayar**.
3. Cetak struk Bluetooth thermal (atau share struk).
4. Jika offline: transaksi simpan lokal (SQLite) → badge "Menunggu sync" → otomatis sync saat online.
5. **Tutup Shift:** Lihat rekap shift (total transaksi, per metode bayar, kas akhir) → Konfirmasi tutup.

### Flow 4 — Void & Koreksi
Kasir/Owner bisa void transaksi di shift yang masih buka (alasan wajib) → Stok kembali → Laporan tandai void, tidak hitung omzet.

### Flow 5 — Laporan untuk Keputusan
Owner buka Laporan → Filter tanggal/outlet → Lihat: Omzet, HPP, Laba bersih, Best seller & produk sepi, Stok menipis, Metode bayar, Jam ramai (heatmap jam) → Export/share (PDF/WA) — *export detail di Open Question.*

### Flow 6 — Langganan
Owner → Menu Langganan → Lihat status trial/sisa hari → Pilih paket → Bayar via Midtrans → Status aktif (webhook). Gagal bayar → reminder + grace 7 hari.

---

## 10. Fitur MVP Detail & Acceptance Criteria

### 10.1 Autentikasi & Role

**Fitur:**
- Daftar Owner, Login Owner, Login Kasir via PIN 6-digit (dibuat Owner, per outlet).
- Role: Owner (full akses), Kasir (hanya: transaksi, lihat produk/stok, buka/tutup shift miliknya, void transaksi miliknya di shift buka).

**Acceptance Criteria:**
- [ ] Owner bisa daftar dengan email + WA + password, dapat trial 14 hari otomatis.
- [ ] Owner bisa buat akun Kasir (nama, PIN 6-digit, assign outlet). Kasir tidak bisa akses menu: produk edit, laporan gabungan semua outlet, setting pajak, kelola langganan.
- [ ] Kasir login di Android via PIN cepat (<3 detik), Owner via email+password di web & mobile.
- [ ] Sesi login aman, logout, dan proteksi route (kasir tidak bisa buka URL dashboard laporan via web jika coba).
- [ ] Validasi: email format benar, WA format Indonesia, password min 8 karakter, PIN 6 digit unik per outlet.

### 10.2 Outlet Management

**Fitur:** CRUD outlet (nama, alamat, telp), set pajak % dan biaya layanan % opsional per outlet, set struk header/footer.

**AC:**
- [ ] Starter hanya bisa 1 outlet aktif; Tumbuh up to 3; Jaringan sesuai custom.
- [ ] Pajak & layanan 0–11% (opsional, bisa 0). Jika diisi, otomatis hitung di transaksi & laporan.
- [ ] Non-aktif outlet tidak bisa dipakai transaksi, tapi data historis tetap di laporan.

### 10.3 Produk, Varian & Stok Per Varian

**Fitur:** Produk: nama, kategori, harga modal (HPP), harga jual. Varian: nama + harga jual varian + stok per varian (misal Kopi: S stok 10 Rp 15rb / M stok 20 Rp 18rb / L stok 15 Rp 22rb). Kategori untuk filter kasir.

**AC:**
- [ ] CRUD produk + varian (nama varian + harga jual varian + stok per varian). Minimal 1 varian (default).
- [ ] Stok **per varian** (bukan per produk induk) — akurat untuk F&B.
- [ ] Saat transaksi berhasil, stok varian berkurang otomatis. Void → stok kembali.
- [ ] Peringatan stok menipis per varian (threshold per varian, default 5).
- [ ] Validasi: harga jual > 0, HPP boleh 0 (jika owner belum isi), stok tidak negatif.

### 10.4 Metode Pembayaran (Tanpa Payment Gateway POS)

**Fitur:** Owner atur daftar metode bayar dari dashboard: Cash, QRIS Statis, Transfer Bank, E-Wallet, dll. Kasir pilih saat bayar. (Gateway hanya untuk langganan, bukan transaksi kasir.)

**AC:**
- [ ] CRUD metode bayar (nama, tipe: cash/non-cash, instruksi tampil di struk — misal "QRIS: scan kode di kasir").
- [ ] Minimal 1 metode aktif. Cash selalu ada default.
- [ ] Laporan rekap per metode bayar.
- [ ] Tidak ada integrasi gateway otomatis di transaksi kasir MVP.

### 10.5 Transaksi Kasir Cepat

**Fitur:** Keranjang, pilih varian, qty +/-, subtotal, pajak/layanan otomatis, pilih metode bayar, hitung kembalian (cash), bayar, cetak struk.

**AC:**
- [ ] Tambah produk ke keranjang < 2 tap, ubah qty, hapus item.
- [ ] Subtotal + pajak + layanan terkalkulasi benar per outlet setting.
- [ ] Bayar cash: input uang diterima → kembalian tampil. Non-cash: langsung konfirmasi.
- [ ] Waktu kasir cepat: dari buka app sampai selesai bayar < 15 detik untuk 2 item (di device mid-range).
- [ ] Struk: nama usaha/outlet, tanggal, item + varian + qty + harga, subtotal, pajak/layanan, total, metode bayar, kasir.
- [ ] Offline: transaksi tetap bisa bayar & cetak struk tanpa internet; data simpan lokal (SQLite) dan sync saat online.

### 10.6 Void / Batal Transaksi

**AC:**
- [ ] Void hanya untuk transaksi di shift yang masih buka, oleh pembuat transaksi atau Owner.
- [ ] Wajib isi alasan void. Transaksi void tidak hitung di omzet/laba, tapi tercatat di laporan void.
- [ ] Stok varian kembali saat void.

### 10.7 Buka/Tutup Shift (Kas Harian)

**Fitur:** Buka shift (kas awal), rekap shift berjalan, tutup shift (kas akhir, selisih).

**AC:**
- [ ] Satu kasir hanya bisa punya 1 shift buka per outlet. Owner bisa lihat semua shift.
- [ ] Buka shift wajib input kas awal (bisa 0).
- [ ] Tutup shift tampilkan: total transaksi, total per metode bayar, kas awal + cash masuk - void = kas akhir ekspektasi, input kas akhir aktual, selisih.
- [ ] Laporan shift harian tersimpan dan bisa dilihat Owner.

### 10.8 Cetak Struk Bluetooth Thermal

**AC:**
- [ ] Pair printer Bluetooth thermal (58mm) dari Android.
- [ ] Cetak struk transaksi & rekap tutup shift.
- [ ] Jika printer tidak terhubung, tetap bisa transaksi; opsi "Cetak Ulang" & "Share Struk" (teks/WA).
- [ ] *Open Question ARCHITECTURE:* library Bluetooth & format ESC/POS — diputuskan di arsitektur.

### 10.9 Laporan Lengkap Ringan (Actionable)

**Metrik:**
- Omzet, HPP (dari harga modal), Laba bersih, Jumlah transaksi, Rata-rata per transaksi.
- Best seller (qty & omzet), Produk sepi.
- Stok menipis & habis (per varian).
- Rekap per metode bayar.
- Jam ramai (transaksi per jam, untuk putuskan jam buka/tambah staf).
- Filter: tanggal (hari/minggu/bulan/custom), outlet (gabungan vs per outlet).

**AC:**
- [ ] Laporan akurat: Laba = Omzet - (HPP × qty terjual) - pajak/layanan jika ada (definisi konsisten).
- [ ] Best seller urut qty terjual, tampil top 10.
- [ ] Jam ramai tampil heatmap/bar per jam 06–22.
- [ ] Owner bisa filter & lihat gabungan multi-outlet atau per outlet.
- [ ] Data laporan sinkron dengan transaksi (termasuk offline yang sudah sync).

### 10.10 Langganan & Trial

**AC:**
- [ ] Daftar otomatis dapat trial 14 hari full fitur.
- [ ] Dashboard tampilkan sisa trial & CTA upgrade.
- [ ] Owner bisa pilih paket Starter/Tumbuh/Jaringan, lihat batas outlet. Bayar via Midtrans, webhook update status.
- [ ] Saat trial habis tanpa bayar → mode read-only 7 hari (tidak bisa transaksi baru) lalu freeze — data tidak hilang.
- [ ] Riwayat langganan tercatat. Gagal bayar Midtrans → retry + notifikasi.

### 10.11 Landing Page (SEO)

**AC:**
- [ ] Halaman: Hero (value prop harga murah + CTA trial), Fitur, Harga (3 paket), Testimoni (dummy awal), FAQ, CTA daftar, Footer kontak.
- [ ] SEO: title/meta terstruktur, heading hierarchy, sitemap, OG image, kecepatan < 3 detik, indexable, schema markup untuk pricing/FAQ.
- [ ] CTA "Coba Gratis 14 Hari" → ke daftar.

---

## 11. Aturan Bisnis Khusus

1. Satu transaksi = satu outlet, satu kasir, satu metode bayar (tidak split metode di MVP).
2. Harga jual varian final sudah termasuk setting pajak/layanan outlet (ditampilkan terpisah di struk).
3. HPP (modal) opsional diisi Owner; jika kosong, laba = omzet - pajak/layanan (HPP dianggap 0) — tampilkan warning "Laba belum akurat, lengkapi HPP".
4. Stok per varian tidak boleh negatif (transaksi ditolak jika stok tidak cukup).
5. Void tidak bisa untuk shift yang sudah tutup.
6. Metode pembayaran non-cash (QRIS statis) dianggap lunas saat kasir konfirmasi — tanpa verifikasi otomatis di MVP.
7. Langganan dihitung per akun Owner, bukan per kasir. Midtrans untuk langganan saja.

---

## 12. Kebutuhan Non-Fungsional (Produk Level — Tanpa Solusi Teknis)

- **Offline-first kasir:** Jualan tetap jalan tanpa internet; sync otomatis saat online (SQLite lokal).
- **Performa kasir:** Transaksi < 15 detik, app buka < 2 detik di Android mid-range.
- **Keandalan cetak:** Struk tercetak < 5 detik setelah bayar (jika printer terhubung).
- **Keamanan:** Password hash, PIN kasir hash, sesi aman, kasir tidak bisa akses data outlet lain.
- **Skalabilitas awal:** Dukung 500 outlet aktif di 3 bulan tanpa degradasi laporan.
- **SEO landing:** Skor Lighthouse performance ≥ 90, indexable.

---

## 13. Validasi & Edge Cases

- Internet putus di tengah transaksi → transaksi tetap simpan lokal (SQLite), sync belakangan.
- Stok habis saat dua kasir jualan bersamaan → validasi stok saat bayar, tolak jika tidak cukup + pesan jelas.
- Kasir salah input → void dengan alasan, audit trail.
- Owner lupa tutup shift → reminder & bisa tutup H+1 (shift dianggap tutup otomatis jam 03:00 dengan catatan).
- Printer Bluetooth putus → transaksi tetap sukses, bisa cetak ulang.
- Trial habis saat shift buka → shift tetap bisa tutup, tapi tidak bisa buka shift baru sampai langganan aktif.
- PIN kasir salah 5x → lock 5 menit.

---

## 14. Open Questions untuk ARCHITECTURE.md (JANGAN Dijawab di PRD)

1. **Tech stack final:** Web Dashboard SolidJS latest — SolidStart vs vanilla Solid? Mobile Expo RN — Expo Router? Backend Elysia — cocok untuk offline sync & multi-outlet?
2. **Landing page platform:** Nebeng web dashboard atau dipisah (Astro/Next untuk SEO) — best practice untuk SEO + maintainability + biaya?
3. **Offline sync strategi:** SQLite schema lokal, antrean sync, retry, conflict resolution dua kasir kurangi stok sama.
4. **Bluetooth thermal:** Library & format ESC/POS yang stabil untuk Android Expo.
5. **Database & schema:** Struktur outlet, produk+varian+stok per varian, transaksi, shift, metode bayar, langganan — relasi & index untuk laporan cepat.
6. **Auth & role:** JWT, PIN hash, proteksi antar-outlet.
7. **Monorepo:** Apps/web, apps/mobile, apps/backend, apps/landing — shared types.
8. **Hosting & infra murah tapi andal** untuk harga <50rb tetap profit — region, CDN, backup.
9. **Export laporan:** PDF/Excel/WA share — library & format.
10. **Midtrans integrasi:** Snap vs Subscription API, webhook handling, retry gagal bayar.

---

## 15. Risiko & Mitigasi

| Risiko | Mitigasi MVP |
|---|---|
| Harga terlalu murah → rugi | Volume + paket Tumbuh margin tinggi + tahunan di muka; infra lean; Midtrans fee sudah dihitung |
| Laporan laba tidak dipercaya (HPP kosong) | Warning + edukasi di onboarding "Isi HPP biar laba akurat" |
| Offline sync konflik stok | Stok tidak negatif, validasi saat bayar, audit void |
| Cetak Bluetooth tidak stabil di banyak merk printer | Fokus 58mm umum, sediakan "Share Struk" fallback |
| Churn setelah trial | Onboarding checklist + laporan hari ke-3 push value |

---

## 16. Approval

- [ ] PRD disetujui → lanjut ke **ARCHITECTURE.md**
- [ ] Nama final dipilih (usulan: LarisPOS)
- [ ] Skema harga disepakati (39rb/89rb/custom)

---

*Dokumen ini sengaja tidak memutuskan stack/library/hosting. Semua itu dijawab di ARCHITECTURE.md.*
