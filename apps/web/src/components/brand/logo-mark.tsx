'use client'

import { cn } from '@/lib/cn'

export type LogoTone = 'color' | 'mono' | 'light' | 'dark'

/**
 * Growzy mark — geometric “G” fused with growth bars, a security ring, and an AI node.
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
  const fillPlate = isLight ? '#07131C' : isMono ? 'currentColor' : undefined
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
          <stop stopColor="#5EF2C4" />
          <stop offset="0.45" stopColor="#12D6A0" />
          <stop offset="1" stopColor="#2AE8FF" />
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
        stroke={strokeMain ?? '#5EF2C4'}
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

      {/* Geometric G + security arc */}
      <path
        d="M28.5 15.2c-1.1-3.2-4.2-5.4-7.8-5.4-4.9 0-8.7 3.7-8.7 8.7s3.8 8.7 8.7 8.7c3.2 0 5.9-1.6 7.4-4.1"
        stroke={strokeMain ?? '#FFFFFF'}
        strokeWidth="2.35"
        strokeLinecap="round"
        fill="none"
        className={animated ? 'logo-draw-g' : undefined}
        filter={tone === 'color' ? `url(#${glowId})` : undefined}
      />
      <path
        d="M20.8 20.5 H28.2"
        stroke={strokeMain ?? '#2AE8FF'}
        strokeWidth="2.35"
        strokeLinecap="round"
        className={animated ? 'logo-draw' : undefined}
      />

      {/* AI node */}
      <circle
        cx="28.4"
        cy="20.5"
        r="2.15"
        fill={strokeMain ?? '#5EF2C4'}
        filter={tone === 'color' ? `url(#${glowId})` : undefined}
      />
    </svg>
  )
}
