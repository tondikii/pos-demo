import { Motion } from '@motionone/solid'
import { createEffect, onCleanup, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import type { ParentProps } from 'solid-js'

/**
 * Modal aksesibel + animasi (FadeIn + ScaleIn, transform/opacity only).
 * - Focus trap ringan: focus pindah ke panel saat buka, kembali ke trigger
 *   saat tutup (via `onClose` — caller menyimpan ref trigger bila perlu).
 * - Esc menutup; klik backdrop menutup.
 * - `role="dialog"` + `aria-modal` + label dari `title`.
 */
export interface ModalProps extends ParentProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  /** Lebar maksimal panel (default `max-w-lg`). */
  size?: 'sm' | 'md' | 'lg'
  /** Sembunyikan tombol close "×" di pojok (mis. konfirmasi pakai tombol sendiri). */
  hideClose?: boolean
  children: JSX.Element
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

export function Modal(props: ModalProps) {
  let panelRef: HTMLDivElement | undefined

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && props.open) {
      e.preventDefault()
      props.onClose()
    }
  }

  createEffect(() => {
    if (props.open) {
      document.addEventListener('keydown', handleKeyDown)
      // Body scroll lock selama modal terbuka.
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      onCleanup(() => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = prevOverflow
      })
      // Pindah focus ke panel (bukan tombol close agar tidak "terlompat").
      queueMicrotask(() => panelRef?.focus())
    }
  })

  return (
    <Show when={props.open}>
      {/* Backdrop */}
      <div class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <Motion tag="div"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, easing: 'ease-out' }}
          class="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          onClick={() => props.onClose()}
          aria-hidden="true"
        />
        {/* Panel */}
        <Motion tag="div"
          role="dialog"
          aria-modal="true"
          aria-labelledby={props.title ? 'modal-title' : undefined}
          aria-describedby={props.description ? 'modal-desc' : undefined}
          tabindex={-1}
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, easing: 'ease-out' }}
          class={[
            'relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl',
            SIZE_CLASSES[props.size ?? 'md'],
          ].join(' ')}
        >
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <h2 id="modal-title" class="text-lg font-bold leading-tight text-foreground">
                {props.title}
              </h2>
              <Show when={props.description}>
                <p id="modal-desc" class="mt-0.5 text-sm text-muted-foreground">
                  {props.description}
                </p>
              </Show>
            </div>
            <Show when={!props.hideClose}>
              <button
                type="button"
                aria-label="Tutup dialog"
                onClick={() => props.onClose()}
                class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </Show>
          </div>
          <div class="px-5 py-4 sm:px-6">{props.children}</div>
        </Motion>
      </div>
    </Show>
  )
}
