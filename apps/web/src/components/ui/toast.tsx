import { Motion, Presence } from '@motionone/solid'
import { createSignal, For, Show } from 'solid-js'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const TONE_ICON: Record<ToastTone, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'border-emerald-500/30 bg-emerald-50 text-emerald-700',
  error: 'border-destructive/30 bg-red-50 text-red-700',
  info: 'border-primary/30 bg-blue-50 text-blue-700',
}

const AUTO_DISMISS_MS = 3200

/**
 * Toast container — muncul di kanan bawah, auto-dismiss, animasi
 * transform/opacity saja (presisi prefers-reduced-motion global).
 * Dipakai via `useToast()` pada halaman.
 */
export function ToastProvider() {
  const [items, setItems] = createSignal<ToastItem[]>([])

  function dismiss(id: number) {
    setItems((list) => list.filter((t) => t.id !== id))
  }

  function push(message: string, tone: ToastTone = 'info') {
    const id = Date.now() + Math.random()
    setItems((list) => [...list.slice(-3), { id, message, tone }])
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }

  const api = {
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error'),
    info: (message: string) => push(message, 'info'),
  }

  return {
    api,
    view: (
      <div
        aria-live="polite"
        aria-atomic="false"
        class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2"
      >
        <Presence>
          <For each={items()}>
            {(item) => (
              <Motion tag="div"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2, easing: 'ease-out' }}
                class={[
                  'pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium shadow-lg',
                  TONE_CLASS[item.tone],
                ].join(' ')}
                role={item.tone === 'error' ? 'alert' : 'status'}
              >
                <span aria-hidden="true" class="shrink-0 text-base leading-none">
                  {TONE_ICON[item.tone]}
                </span>
                <span class="min-w-0 flex-1">{item.message}</span>
                <button
                  type="button"
                  aria-label="Tutup notifikasi"
                  onClick={() => dismiss(item.id)}
                  class="shrink-0 rounded-md p-1 opacity-60 transition-opacity duration-150 hover:opacity-100"
                >
                  ✕
                </button>
              </Motion>
            )}
          </For>
        </Presence>
      </div>
    ),
  }
}

export interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export type { ToastItem as Toast }
export { Show }
