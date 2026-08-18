---
name: pos-frontend-stack
description: LarisPOS frontend stack reference — SolidJS+Vite+Tailwind (web), Expo SDK 57+NativeWind (mobile), Astro 7 (landing), @motionone/solid + reanimated animations. Use for any frontend task to align with latest stable versions and ui-ux-pro-max guidance.
---

# LarisPOS Frontend Stack

## Web — `apps/web`
- **SolidJS 1.9.x** + **Vite 8** + **TailwindCSS 4.x** (`@tailwindcss/vite` plugin, `app.css` dengan `@import 'tailwindcss'`)
- **@solidjs/router 1.x** (route di `src/routes/*.tsx` + `app.tsx` Router)
- **@tanstack/solid-query 5.x** — semua fetch via query/mutation, mock di Fase 2
- **@motionone/solid 10.x** — animasi (lihat skill `pos-motion`)
- Validasi form: Zod dari `@larispos/shared` via `src/lib/validation.ts` (`parseWithZod`)
- Mock state: `src/lib/auth-mock.tsx` (localStorage), `src/lib/mocks.ts`

## Mobile — `apps/mobile`
- **Expo SDK 57** + **Expo Router** (file-based `app/`), `"main": "expo-router/entry"`
- **react-native-reanimated 4.5.1** + worklets 0.10.1 (Expo Go supported, no config plugin needed)
- NativeWind 4.x untuk styling (Tailwind di RN) — setup via `nativewind-env.d.ts` + `babel-preset-expo`
- Offline: expo-sqlite `queued_transactions` + produk cache; token di expo-secure-store
- `metro.config.js` sudah di-set untuk monorepo (watchFolders root + nodeModulesPaths)

## Landing — `apps/landing`
- **Astro 7.x** static + Tailwind, `Layout.astro` SEO (title/meta/OG), `astro-sitemap` + `astro-robots-txt`
- JSON-LD Product + FAQPage, heading hierarchy, Lighthouse ≥95

## Versi (latest stable per 2026-08)
solid-js 1.9.14 · vite 8.2.1 · tailwindcss 4.3 · @tanstack/solid-query 5.101 · @motionone/solid 10.16 · expo 57.0.14 · react-native 0.86.2 · reanimated 4.5.1 · astro 7.2.2 · typescript 5.9.3 (web) / 6.0.3 (mobile per expo)
