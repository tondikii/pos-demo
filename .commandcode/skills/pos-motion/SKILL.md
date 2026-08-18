---
name: pos-motion
description: Animation patterns for LarisPOS — @motionone/solid (web) + react-native-reanimated (mobile), sourced from ui-ux-pro-max motion.csv. Use when adding hover/scroll/page/stagger/loading animations to any LarisPOS UI.
---

# LarisPOS Motion (Web + Mobile)

Sumber pola: `.agents/skills/ui-ux-pro-max/data/motion.csv` (hover micro-interaction, scroll reveal, stagger list, page transition, parallax, loading skeleton, carousel). Hormati `prefers-reduced-motion`.

## Web (SolidJS) — `@motionone/solid`

Library: `@motionone/solid` (10.x, official motion.dev untuk Solid). Import: `import { motion, animate, stagger } from '@motionone/solid'`.

```tsx
// hover micro-interaction (dari motion.csv tier Subtle)
<motion.div
  whileHover={{ y: -1, opacity: 0.9, transition: { duration: 0.15, easing: 'power1.out' } }}
>
  {children}
</motion.div>

// stagger list entrance (grid/cards, tier Standard)
<motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, easing: 'back.out(1.4)' }} />

// page transition (SolidStart route level): fade < 250ms exit, < 350ms enter
```

## Mobile (React Native) — `react-native-reanimated` 4.x

Library: `react-native-reanimated@4.5.1` + `react-native-worklets@0.10.1` (sudah di apps/mobile). Babel preset `react-native-reanimated/plugin` WAJIB ada di `babel.config.js`.

```tsx
import Animated, { FadeIn, FadeOut, ZoomIn, SlideInRight, LinearTransition } from 'react-native-reanimated'

// entrance
<Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
// stagger kartu
<Animated.View entering={ZoomIn.delay(i * 60).duration(250)}>
// list reorder / layout transition
<Animated.View layout={LinearTransition.springify()}>
```

## Aturan

1. Selalu cek `matchMedia('(prefers-reduced-motion: reduce)')` — web: skip non-essential motion; mobile: `useReducedMotion()` dari reanimated.
2. Hanya animasi `transform`/`opacity` — jangan animasi width/height/margin (layout jank).
3. Durasi: hover 150-250ms, scroll reveal 300-500ms, page transition ≤250ms exit.
4. Stagger maks ~8 item per grid (motion.csv).
5. Kill/pause tween saat offscreen/visibility hidden (web: cleanup di onCleanup; mobile: reanimated otomatis dengan entering/exiting).
6. Skeleton loading: shimmer gradient (bukan opacity pulse) — sync satu timeline per grup.
7. Parallax hanya untuk layer dekoratif, delta kecil 5-15%, bukan teks.
