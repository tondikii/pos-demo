import type { ParentProps } from 'solid-js'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'outline'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary',
  primary: 'bg-primary text-on-primary',
  success: 'bg-emerald-500/10 text-emerald-700',
  warning: 'bg-amber-500/10 text-amber-700',
  danger: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  outline: 'border border-border bg-card text-muted-foreground',
}

export interface BadgeProps extends ParentProps {
  variant?: BadgeVariant
  class?: string
}

/** Badge kecil (pill) — kategori, status stok, dsb. */
export function Badge(props: BadgeProps) {
  const variant = () => props.variant ?? 'default'
  return (
    <span
      class={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-4',
        VARIANT_CLASSES[variant()],
        props.class ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {props.children}
    </span>
  )
}
