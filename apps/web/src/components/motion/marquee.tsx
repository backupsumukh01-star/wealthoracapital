'use client'

import { Children, type ReactNode } from 'react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export interface MarqueeProps {
  children: ReactNode
  /** Seconds for one full pass. Slower reads as calmer. */
  speed?: number
  direction?: 'left' | 'right'
  pauseOnHover?: boolean
  className?: string
  /** Tighter card gaps for compact tapes (e.g. market ticker). */
  dense?: boolean
}

/**
 * Continuously scrolling strip via CSS keyframes so hover can pause cleanly.
 * Dual tracks + translate -50% keep the loop seamless without jumps or blank gaps.
 */
export function Marquee({
  children,
  speed = 40,
  direction = 'left',
  pauseOnHover = true,
  className,
  dense = false,
}: MarqueeProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const items = Children.toArray(children)
  const rowGap = dense ? 'gap-1.5 pr-1.5 sm:gap-2 sm:pr-2' : 'gap-2.5 pr-2.5 sm:gap-3 sm:pr-3'

  if (prefersReducedMotion) {
    return (
      <div className={cn('no-scrollbar flex overflow-x-auto', dense ? 'gap-1.5' : 'gap-2.5 sm:gap-3', className)}>
        {items}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative min-w-0 overflow-hidden',
        pauseOnHover && '[&:hover_.marquee-track]:[animation-play-state:paused]',
        pauseOnHover && '[&:focus-within_.marquee-track]:[animation-play-state:paused]',
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          'marquee-track flex w-max will-change-transform',
          direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse',
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        <div className={cn('flex shrink-0 items-center', rowGap)}>{items}</div>
        <div className={cn('flex shrink-0 items-center', rowGap)} aria-hidden>
          {items}
        </div>
      </div>
    </div>
  )
}
