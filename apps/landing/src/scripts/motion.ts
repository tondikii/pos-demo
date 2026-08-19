/**
 * LarisPOS landing motion — @motionone/dom (skill pos-motion).
 * Astro bundle script ini; konten tetap tampil tanpa JS (progressive enhancement).
 * Reduced-motion: skip semua animasi, final state tampil.
 */
import { animate, inView, stagger } from '@motionone/dom'

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)')

if (!prefersReduced.matches) {
  document.documentElement.classList.add('js')

  // Hero entrance — fade-up berurutan
  const heroChildren = document.querySelectorAll('.hero-inner > *')
  heroChildren.forEach((el, i) => {
    animate(
      el,
      { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] },
      { duration: 0.55, delay: 0.06 * i, easing: [0.22, 1, 0.36, 1] },
    )
  })

  // Scroll reveal per section
  document.querySelectorAll('[data-reveal]:not([data-reveal="stagger"])').forEach((el) => {
    inView(
      el,
      () => {
        animate(
          el,
          { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0px)'] },
          { duration: 0.5, easing: [0.22, 1, 0.36, 1] },
        )
      },
      { margin: '-60px' },
    )
  })

  // Scroll reveal dengan stagger anak
  document.querySelectorAll('[data-reveal="stagger"]').forEach((el) => {
    const items = Array.from(el.children)
    inView(
      el,
      () => {
        animate(
          items,
          { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'] },
          { duration: 0.45, delay: stagger(0.06), easing: [0.22, 1, 0.36, 1] },
        )
      },
      { margin: '-60px' },
    )
  })

  // Hover lift micro-interaction
  document.querySelectorAll('[data-hover]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      animate(el, { scale: 1.02 }, { duration: 0.2 })
    })
    el.addEventListener('mouseleave', () => {
      animate(el, { scale: 1 }, { duration: 0.2 })
    })
  })
} else {
  document.documentElement.classList.add('js')
}
