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
}

/**
 * Continuously scrolling strip via CSS keyframes so hover can pause cleanly.
 * Dual tracks + translate -50% keep the loop seamless without jumps.
 */
export function Marquee({
  children,
  speed = 40,
  direction = 'left',
  pauseOnHover = true,
  className,
}: MarqueeProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const items = Children.toArray(children)

  if (prefersReducedMotion) {
    return (
      <div className={cn('no-scrollbar flex gap-2.5 overflow-x-auto sm:gap-3', className)}>
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
        <div className="flex shrink-0 items-center gap-2.5 pr-2.5 sm:gap-3 sm:pr-3">{items}</div>
        <div className="flex shrink-0 items-center gap-2.5 pr-2.5 sm:gap-3 sm:pr-3" aria-hidden>
          {items}
        </div>
      </div>
    </div>
  )
}
