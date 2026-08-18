/**
 * SEO helpers untuk landing page — JSON-LD (schema.org) + data FAQ.
 *
 * ⚠️ SYNC: harga paket di sini mengikuti `./pricing.ts` (single source harga
 * landing; nilai aslinya dari `packages/shared` — lihat catatan di pricing.ts).
 */

export interface FAQ {
  q: string
  a: string
}

/** 8 FAQ section #faq — satu sumber kebenaran untuk FAQPage JSON-LD. */
export const FAQS: FAQ[] = [
  {
    q: 'Apakah benar cuma Rp 39rb?',
    a: 'Benar. Paket Starter Rp 39.000/bulan (atau Rp 390.000/tahun, hemat 17%) sudah termasuk kasir cepat, offline-first, laporan laba otomatis, stok per varian, dan cetak struk. Tanpa biaya tersembunyi.',
  },
  {
    q: 'Bagaimana kalau internet mati?',
    a: 'Tetap bisa jualan. LarisPOS offline-first: transaksi dicatat di perangkat dan otomatis tersinkron ke cloud begitu internet kembali. Data tidak ada yang hilang.',
  },
  {
    q: 'Bisa untuk 2 cabang?',
    a: 'Bisa. Paket Tumbuh mencakup hingga 3 outlet sekaligus, lengkap dengan laporan gabungan. Butuh lebih banyak? Paket Jaringan mendukung hingga 99 outlet.',
  },
  {
    q: 'Printer apa yang didukung?',
    a: 'Printer struk thermal 58mm maupun 80mm — koneksi Bluetooth atau USB — dari merek umum seperti Epson dan printer kasir standar lainnya. Belum punya printer? Struk tetap bisa dibagikan via WhatsApp.',
  },
  {
    q: 'Apakah ada kontrak?',
    a: 'Tidak ada. Berlangganan bulanan, bisa berhenti kapan saja tanpa penalti. Upgrade atau downgrade paket juga bisa kapan saja.',
  },
  {
    q: 'Data saya aman?',
    a: 'Data tersinkron ke server dengan enkripsi, backup otomatis setiap hari, dan akses aplikasi dilindungi PIN. Data usaha Anda tidak dibagikan ke pihak mana pun.',
  },
  {
    q: 'Bisa coba gratis?',
    a: 'Bisa. 14 hari gratis, tanpa kartu kredit, semua fitur terbuka penuh. Baru bayar kalau memang cocok.',
  },
  {
    q: 'Bagaimana cara mulai?',
    a: 'Klik tombol "Coba Gratis 14 Hari", daftar dengan email, buat outlet pertama, lalu tambahkan produk — biasanya selesai dalam 15 menit. Tim kami siap bantu via chat bila ada kendala.',
  },
]

const SITE_URL = 'https://larispos.id'

/**
 * JSON-LD Product — harga dari PLANS.starter (Rp 39.000/bulan, IDR).
 * `lowPrice` dipakai untuk menandai harga termurah paket (Starter).
 */
export function productJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'LarisPOS',
    description:
      'POS untuk UMKM F&B Indonesia: kasir cepat di bawah 15 detik, laporan laba otomatis, dan tetap jalan saat internet offline. Mulai Rp 39rb/bulan, coba gratis 14 hari tanpa kartu kredit.',
    image: `${SITE_URL}/og-default.png`,
    brand: { '@type': 'Brand', name: 'LarisPOS' },
    url: `${SITE_URL}/`,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/#harga`,
      priceCurrency: 'IDR',
      price: 39000,
      lowPrice: 39000,
      highPrice: 149000,
      offerCount: 3,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      description:
        'Paket Starter Rp 39.000/bulan, Tumbuh Rp 89.000/bulan, Jaringan custom. Semua paket bisa dicoba gratis 14 hari.',
    },
    aggregateRating: undefined,
    review: undefined,
  }
}
