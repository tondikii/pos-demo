import { A } from '@solidjs/router'
import { For } from 'solid-js'
import { Icon } from './icon'

export interface Crumb {
  label: string
  href?: string
}

/** Breadcrumb sederhana — "Pengaturan / Langganan". Terakhir = halaman aktif (tanpa link). */
export function Breadcrumb(props: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" class="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <For each={props.items}>
        {(item, i) => (
          <>
            {i() > 0 && (
              <Icon name="chevron" class="size-3.5 -rotate-90 text-muted-foreground/60" aria-hidden="true" />
            )}
            {item.href ? (
              <A href={item.href} class="font-medium transition-colors hover:text-primary">
                {item.label}
              </A>
            ) : (
              <span class="font-semibold text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </>
        )}
      </For>
    </nav>
  )
}
