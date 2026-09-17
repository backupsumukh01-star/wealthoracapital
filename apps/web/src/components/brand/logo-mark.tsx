'use client'

import { cn } from '@/lib/cn'

export type LogoTone = 'color' | 'mono' | 'light' | 'dark'

/**
 * Wealthora mark — geometric “W” fused with growth bars, a security ring, and an AI node.
 * Original SVG; no stock marks.
 */
export function LogoMark({
  className,
  tone = 'color',
  animated = false,
}: {
  className?: string
  tone?: LogoTone
  /** When true, strokes can be drawn via CSS/Framer (logo intro). */
  animated?: boolean
}) {
  const gid = 'gz-grad'
  const glowId = 'gz-glow'

  const isMono = tone === 'mono'
  const isLight = tone === 'light'
  const fillPlate = isLight ? '#07090B' : isMono ? 'currentColor' : undefined
  const strokeMain = isMono || isLight ? 'currentColor' : undefined

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gid} x1="6" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4CBD3" />
          <stop offset="0.45" stopColor="#D4D9DF" />
          <stop offset="1" stopColor="#F2F4F7" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft plate */}
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="11"
        fill={fillPlate ?? `url(#${gid})`}
        opacity={isMono ? 0.14 : isLight ? 1 : 0.18}
      />
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="10.5"
        stroke={strokeMain ?? `url(#${gid})`}
        strokeWidth="1.25"
        opacity={0.85}
      />

      {/* Growth bars (investment) */}
      <g
        filter={tone === 'color' ? `url(#${glowId})` : undefined}
        stroke={strokeMain ?? '#D4D9DF'}
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path
          d="M12 26 V22"
          className={animated ? 'logo-draw' : undefined}
          style={animated ? { strokeDasharray: 20, strokeDashoffset: 0 } : undefined}
        />
        <path d="M16.5 26 V18.5" className={animated ? 'logo-draw' : undefined} />
        <path d="M21 26 V15" className={animated ? 'logo-draw' : undefined} />
      </g>

      {/* Geometric W */}
      <path
        d="M11.5 13.2 L16.4 27.2 L20 17.2 L23.6 27.2 L28.5 13.2"
        stroke={strokeMain ?? '#FFFFFF'}
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={animated ? 'logo-draw-g' : undefined}
        filter={tone === 'color' ? `url(#${glowId})` : undefined}
      />

      {/* AI node */}
      <circle
        cx="28.5"
        cy="13.2"
        r="2.15"
        fill={strokeMain ?? '#C9A45C'}
        filter={tone === 'color' ? `url(#${glowId})` : undefined}
      />
    </svg>
  )
}
