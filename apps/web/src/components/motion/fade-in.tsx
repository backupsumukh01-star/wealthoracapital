'use client'

import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { DURATION, EASE_OUT } from './motion-config'
import { useMotionComponent } from './use-motion-component'

export interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  /** Distance travelled, in pixels. Transform only — layout never animates. */
  y?: number
  as?: ElementType
  className?: string
}

/** Entrance animation for content that is already on screen when the page mounts. */
export function FadeIn({
  children,
  delay = 0,
  duration = DURATION.slower,
  y = 16,
  as = 'div',
  className,
}: FadeInProps) {
  const Component = useMotionComponent(as)

  return (
    <Component
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}
