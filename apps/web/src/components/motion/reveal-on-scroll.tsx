'use client'

import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { DURATION, EASE_OUT } from './motion-config'
import { useMotionComponent } from './use-motion-component'

export interface RevealOnScrollProps {
  children: ReactNode
  delay?: number
  y?: number
  scale?: number
  as?: ElementType
  className?: string
  /** Fraction visible before the reveal fires. */
  amount?: number
}

/**
 * Scroll reveal: opacity 0→1 and a soft rise, triggered once when entering view.
 *
 * Only opacity and transform animate, so text is readable before the animation finishes and
 * nothing reflows. A section that re-animates on every scroll pass is noise, so `once` is not
 * configurable.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  y = 24,
  scale = 0.985,
  as = 'div',
  className,
  amount = 0.15,
}: RevealOnScrollProps) {
  const Component = useMotionComponent(as)

  return (
    <Component
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: DURATION.slower, delay, ease: EASE_OUT }}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}
