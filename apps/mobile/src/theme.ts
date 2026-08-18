/**
 * Design tokens bersama untuk seluruh screen mobile (Fase 2B.7 — Polish).
 * Palet tunggal: bg #F8FAFC, text #0F172A, muted #64748B, primary #2563EB,
 * success (aksi utama kasir: bayar/buka shift) #16A34A.
 *
 * Screens lain yang masih memakai hex hardcoded boleh bertahan selama nilainya
 * identik — refactor bertahap (jangan refactor semua sekaligus).
 */

export const COLORS = {
  // --- permukaan & teks ---
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfacePressed: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  placeholder: '#94A3B8',

  // --- aksi utama (biru) ---
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#EFF6FF',

  // --- aksi positif (hijau — bayar / buka shift) ---
  success: '#16A34A',
  successPressed: '#15803D',
  successSoft: '#F0FDF4',
  successBorder: '#86EFAC',
  successStrong: '#15803D',

  // --- bahaya / void ---
  danger: '#DC2626',
  dangerPressed: '#B91C1C',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerStrong: '#B91C1C',
  /** Alias error — dipakai teks error form & login (sama dengan danger). */
  error: '#DC2626',

  // --- peringatan / offline ---
  warning: '#B45309',
  warningStrong: '#9A3412',
  warningIcon: '#EA580C',
  warningIconPressed: '#C2410C',
  warningSoft: '#FFF7ED',
  warningBorder: '#FED7AA',

  // --- void badge ---
  voided: '#7C3AED',
  voidedStrong: '#6D28D9',
  voidedSoft: '#F3E8FF',
  voidedBorder: '#D8B4FE',

  // --- status antrean sync ---
  pendingSoft: '#FFF7ED',
  syncingSoft: '#EFF6FF',
  failedSoft: '#FEE2E2',
  grayBadge: '#F1F5F9',
  grayBadgeText: '#475569',
  offlineDot: '#F59E0B',

  // --- overlay & aksen ---
  overlay: 'rgba(15, 23, 42, 0.55)',
  successOverlay: 'rgba(16, 185, 129, 0.94)',
  dotEmpty: '#CBD5E1',
  /** Dot PIN terisi — sama dengan primary. */
  dotFilled: '#2563EB',
} as const

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  full: 999,
} as const
