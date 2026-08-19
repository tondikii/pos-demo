import { Navigate } from '@solidjs/router'
import { useAuth } from '../lib/auth-mock'

/**
 * /onboarding — TIDAK dipakai lagi (PRD Flow 1 ringkas).
 *
 * Daftar sekarang 1 form: outlet "Outlet Utama" dibuat otomatis dari nama
 * bisnis (auth-mock), jadi tidak ada step onboarding wajib. Halaman ini
 * hanya redirect:
 * - belum login → /register
 * - sudah login → /dashboard (outlet pasti sudah ada)
 */
export default function OnboardingPage() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated() ? <Navigate href="/dashboard" /> : <Navigate href="/register" />
}
