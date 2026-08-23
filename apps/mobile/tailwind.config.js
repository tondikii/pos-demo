/**
 * Tailwind config mobile kasir — warna WAJIB identik dengan
 * `src/theme.ts` (single source of truth: MASTER.md design tokens).
 * Jika mengubah warna di MASTER.md/theme.ts, sinkronkan di sini.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' (bukan default 'media') — di web, mode 'media' membuat
  // react-native-css-interop melempar error saat Appearance.set dipanggil.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // permukaan & teks (MASTER.md)
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceMuted: '#F1F5F9',
        surfacePressed: '#E2E8F0',
        text: '#0F172A',
        'text-muted': '#64748B',
        border: '#E2E8F0',
        placeholder: '#94A3B8',
        // aksi utama (biru)
        primary: '#2563EB',
        'primary-pressed': '#1D4ED8',
        'primary-soft': '#EFF6FF',
        // aksi positif (hijau — bayar / buka shift)
        success: '#16A34A',
        'success-pressed': '#15803D',
        'success-soft': '#F0FDF4',
        'success-border': '#86EFAC',
        // bahaya / void
        danger: '#DC2626',
        'danger-pressed': '#B91C1C',
        'danger-soft': '#FEF2F2',
        'danger-border': '#FECACA',
        // peringatan / offline
        warning: '#B45309',
        'warning-strong': '#9A3412',
        'warning-icon': '#EA580C',
        'warning-soft': '#FFF7ED',
        'warning-border': '#FED7AA',
        // status sync
        'pending-soft': '#FFF7ED',
        'syncing-soft': '#EFF6FF',
        'failed-soft': '#FEE2E2',
        'gray-badge': '#F1F5F9',
        'gray-badge-text': '#475569',
        'offline-dot': '#F59E0B',
        // teks di atas warna solid
        'on-primary': '#FFFFFF',
        'on-success': '#FFFFFF',
        // overlay
        overlay: 'rgba(15, 23, 42, 0.5)',
      },
      fontFamily: {
        // Plus Jakarta Sans — weight per file (RN tidak auto-select weight)
        regular: ['PlusJakartaSans_400Regular'],
        medium: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
        extrabold: ['PlusJakartaSans_800ExtraBold'],
      },
    },
  },
  plugins: [],
}