import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

/**
 * Icon SVG inline (no emoji) — stroke tipis seragam (2px default), warna
 * mengikuti prop color. Satu-satunya set ikon mobile (ui-ux-pro-max: satu
 * family per layer; stroke konsisten).
 */
export default function Icon({
  name,
  size = 20,
  color = '#0F172A',
  strokeWidth = 2,
}: {
  name: string
  size?: number
  color?: string
  strokeWidth?: number
}) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M4 12l5 5L20 6" />
        </Svg>
      )
    case 'warning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M12 3L1 21h22L12 3z" />
          <Path {...common} d="M12 10v5" />
          <Path {...common} d="M12 18h.01" />
        </Svg>
      )
    case 'printer':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M6 9V2h12v7" />
          <Path {...common} d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
          <Path {...common} d="M6 14h12v8H6z" />
        </Svg>
      )
    case 'bluetooth':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M7 7l10 10-5 4V3l5 4L7 17" />
        </Svg>
      )
    case 'share':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M4 12v8h16v-8" />
          <Path {...common} d="M12 3v13" />
          <Path {...common} d="M7 8l5-5 5 5" />
        </Svg>
      )
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...common} cx="12" cy="12" r="9" />
          <Path {...common} d="M12 7v5l3 2" />
        </Svg>
      )
    case 'receipt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M5 3h14v18l-2-1.5L15 21l-3-1.5L9 21l-2-1.5L5 21V3z" />
          <Path {...common} d="M9 8h6M9 12h6" />
        </Svg>
      )
    case 'sync':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M21 12a9 9 0 01-15 6.7M3 12a9 9 0 0115-6.7" />
          <Path {...common} d="M21 3v6h-6M3 21v-6h6" />
        </Svg>
      )
    case 'cart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M3 3h2l2.4 12.4a2 2 0 002 1.6h8.7a2 2 0 002-1.6L21 7H6" />
          <Circle {...common} cx="9" cy="20" r="1.5" />
          <Circle {...common} cx="17" cy="20" r="1.5" />
        </Svg>
      )
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M12 5v14M5 12h14" />
        </Svg>
      )
    case 'minus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M5 12h14" />
        </Svg>
      )
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M4 7h16" />
          <Path {...common} d="M9 7V4h6v3" />
          <Path {...common} d="M6 7l1 13h10l1-13" />
          <Path {...common} d="M10 11v5M14 11v5" />
        </Svg>
      )
    case 'logout':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <Path {...common} d="M16 17l5-5-5-5" />
          <Path {...common} d="M21 12H9" />
        </Svg>
      )
    case 'qrcode':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...common} x="3" y="3" width="7" height="7" rx="1" />
          <Rect {...common} x="14" y="3" width="7" height="7" rx="1" />
          <Rect {...common} x="3" y="14" width="7" height="7" rx="1" />
          <Path {...common} d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01" />
        </Svg>
      )
    case 'wallet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M3 7a2 2 0 012-2h13a2 2 0 012 2v2" />
          <Path {...common} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2H5" />
          <Path {...common} d="M16 12h.01" />
        </Svg>
      )
    case 'mug':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M4 9h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4z" />
          <Path {...common} d="M16 10h2a2 2 0 010 5h-2" />
        </Svg>
      )
    case 'glass':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M7 3h10l-1 15a3 3 0 01-6 0z" />
          <Path {...common} d="M7 8h10" />
        </Svg>
      )
    case 'cookie':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...common} cx="12" cy="12" r="8" />
          <Circle {...common} cx="9" cy="9" r="0.8" />
          <Circle {...common} cx="15" cy="11" r="0.8" />
          <Circle {...common} cx="11" cy="16" r="0.8" />
        </Svg>
      )
    case 'edit':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M12 20h9" />
          <Path {...common} d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
        </Svg>
      )
    case 'food':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M4 3v7a2 2 0 004 0V3" />
          <Path {...common} d="M6 3v18" />
          <Path {...common} d="M14 3v7a2 2 0 004 0V3" />
          <Path {...common} d="M16 3v18" />
        </Svg>
      )
    case 'signal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M2 20h20" />
          <Path {...common} d="M5 20v-4M9 20v-8M13 20V8M17 20V4" />
        </Svg>
      )
    case 'inbox':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M2 12l3.5-7h13L22 12" />
          <Path {...common} d="M2 12h6l2 3h4l2-3h6" />
          <Path {...common} d="M2 12v7h20v-7" />
        </Svg>
      )
    case 'cash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...common} x="2" y="6" width="20" height="12" rx="2" />
          <Circle {...common} cx="12" cy="12" r="3" />
          <Path {...common} d="M6 12h.01M18 12h.01" />
        </Svg>
      )
    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...common} x="4" y="10" width="16" height="11" rx="2" />
          <Path {...common} d="M8 10V7a4 4 0 018 0v3" />
        </Svg>
      )
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M6 6l12 12M18 6L6 18" />
        </Svg>
      )
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...common} cx="11" cy="11" r="7" />
          <Path {...common} d="M21 21l-4.3-4.3" />
        </Svg>
      )
    case 'refresh':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M21 12a9 9 0 11-2.6-6.3" />
          <Path {...common} d="M21 3v6h-6" />
        </Svg>
      )
    case 'backspace':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7 6-7z" />
          <Path {...common} d="M13 10l4 4M17 10l-4 4" />
        </Svg>
      )
    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M9 6l6 6-6 6" />
        </Svg>
      )
    case 'chevron-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M15 6l-6 6 6 6" />
        </Svg>
      )
    case 'history':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M3 12a9 9 0 109-9 9.8 9.8 0 00-6.4 2.6L3 8" />
          <Path {...common} d="M3 3v5h5" />
          <Path {...common} d="M12 7v5l3 2" />
        </Svg>
      )
    case 'power':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M12 2v10" />
          <Path {...common} d="M18.4 6.6a9 9 0 11-12.8 0" />
        </Svg>
      )
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...common} cx="12" cy="12" r="3" />
          <Path {...common} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </Svg>
      )
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...common} cx="12" cy="12" r="10" />
          <Path {...common} d="M12 16v-4" />
          <Path {...common} d="M12 8h.01" />
        </Svg>
      )
    case 'store':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...common} d="M3 9l1-4h16l1 4" />
          <Path {...common} d="M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9" />
          <Path {...common} d="M9 21V13h6v8" />
        </Svg>
      )
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...common} cx="12" cy="12" r="9" />
        </Svg>
      )
  }
}