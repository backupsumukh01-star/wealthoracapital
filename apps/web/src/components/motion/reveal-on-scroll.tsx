'use client'

import { useState, type ElementType, type ReactNode } from 'react'

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
 * After the reveal finishes we swap to a plain element (no Framer transform).
 * Persistent transforms create compositor layers that can steal clicks from
 * sticky/fixed chrome while the page is scrolled.
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
  const [revealed, setRevealed] = useState(false)
  const Tag = as

  if (revealed) {
    return <Tag className={cn(className)}>{children}</Tag>
  }

  return (
    <Component
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: DURATION.slower, delay, ease: EASE_OUT }}
      onAnimationComplete={() => setRevealed(true)}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}
