'use client'

import type { ElementType, ReactNode } from 'react'
import { createElement } from 'react'

import { cn } from '@/lib/cn'

export interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  /** Distance travelled, in pixels — applied via CSS custom property. */
  y?: number
  as?: ElementType
  className?: string
}

/**
 * CSS entrance — no Framer Motion dependency on the critical path.
 * Prefer transform/opacity so layout work stays off the animation.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.56,
  y = 16,
  as = 'div',
  className,
}: FadeInProps) {
  return createElement(
    as,
    {
      className: cn('motion-safe:animate-fade-up', className),
      style: {
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        ['--fade-y' as string]: `${y}px`,
      },
    },
    children,
  )
}
