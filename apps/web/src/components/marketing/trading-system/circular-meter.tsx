'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export function CircularMeter({
  label,
  value,
  display,
  tone = 'accent',
}: {
  label: string
  /** 0–100 fill */
  value: number
  display: string
  tone?: 'accent' | 'emerald' | 'amber' | 'violet' | 'cyan'
}) {
  const id = useId()
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.45 })
  const prefersReducedMotion = usePrefersReducedMotion()
  const [progress, setProgress] = useState(0)

  /** Logical SVG size; CSS scales the rendered meter for narrow viewports. */
  const size = 128
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(value)
      return
    }
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.35,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setProgress,
    })
    return () => controls.stop()
  }, [inView, prefersReducedMotion, value])

  const toneStroke =
    tone === 'emerald'
      ? 'var(--hl-emerald)'
      : tone === 'amber'
        ? 'var(--hl-amber)'
        : tone === 'violet'
          ? 'var(--hl-violet)'
          : tone === 'cyan'
            ? 'var(--hl-cyan)'
            : 'var(--accent-300)'

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative size-24 sm:size-28">
        <svg
          ref={ref}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 size-full"
          role="img"
          aria-label={`${label}: ${display}`}
        >
          <defs>
            <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border-default)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={toneStroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (progress / 100) * c}
            filter={`url(#${id}-glow)`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-heading-sm tabular-nums text-fg">{display}</span>
        </div>
      </div>
      <p className={cn('text-caption max-w-[9rem] text-fg-muted')}>{label}</p>
    </div>
  )
}
