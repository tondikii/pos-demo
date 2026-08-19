import type { JSX } from 'solid-js'

/** Icon SVG inline (no emoji) — stroke tipis, ukuran via class size-* */
export function Icon(props: {
  name: string
  class?: string
  'aria-hidden'?: boolean | 'true' | 'false'
} & Record<string, unknown>) {
  const { name, class: cls = 'size-4', ...rest } = props
  const paths: Record<string, JSX.Element> = {
    inbox: <><path d="M2 12l3.5-7h13L22 12" /><path d="M2 12h6l2 3h4l2-3h6" /><path d="M2 12v7h20v-7" /></>,
    alert: <><path d="M12 3L2 20h20L12 3z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M7 15l3-4 3 2 5-7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    store: <><path d="M3 9l1.5-5h15L21 9" /><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" /><path d="M5 11v9h14v-9" /></>,
    receipt: <><path d="M5 3h14v18l-2-1.5L15 21l-3-1.5L9 21l-2-1.5L5 21V3z" /><path d="M9 8h6M9 12h6" /></>,
    check: <><path d="M4 12l5 5L20 6" /></>,
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    bolt: <><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></>,
    wifiOff: <><path d="M2 8.5a15 15 0 014-2.5M8 5a15 15 0 0112 3.5" /><path d="M5 12a10 10 0 013-2M12 9a10 10 0 017 3" /><path d="M2 2l20 20" /><path d="M9 15a5 5 0 014-1.7" /><circle cx="12" cy="19" r="1" /></>,
    box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
    layers: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 12l10 5 10-5" /><path d="M2 17l10 5 10-5" /></>,
    printer: <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 16h10l1-16" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    sync: <><path d="M21 12a9 9 0 01-15 6.7M3 12a9 9 0 0115-6.7" /><path d="M21 3v6h-6M3 21v-6h6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <><path d="M5 12h14" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" /></>,
    phone: <><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.8a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.4-1.3a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.6 2z" /></>,
    food: <><path d="M4 3v7a2 2 0 004 0V3" /><path d="M6 3v18" /><path d="M14 3v7a2 2 0 004 0V3" /><path d="M16 3v18" /></>,
    warning: <><path d="M12 3L1 21h22L12 3z" /><path d="M12 10v5" /><path d="M12 18h.01" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    cashier: <><rect x="3" y="4" width="18" height="7" rx="1.5" /><path d="M3 11v7a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M8 8h.01M12 8h.01M16 8h.01" /><path d="M8 17h8" /></>,
    menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
    chevron: <><path d="M6 9l6 6 6-6" /></>,
    sliders: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="7" cy="18" r="2" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
    wallet: <><path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /><path d="M16 13h4" /><path d="M16 11h.01" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={cls}
      aria-hidden={props['aria-hidden'] ?? true}
      {...rest}
    >
      {paths[name] ?? paths.inbox}
    </svg>
  )
}
