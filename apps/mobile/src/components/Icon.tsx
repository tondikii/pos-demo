import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

/** Icon SVG inline (no emoji) — stroke tipis, warna mengikuti prop color. */
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
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...common} cx="12" cy="12" r="9" />
        </Svg>
      )
  }
}
