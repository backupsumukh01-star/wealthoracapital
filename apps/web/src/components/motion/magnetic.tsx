'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface MagneticProps {
  children: ReactNode
  /** Kept for API compatibility — magnetic pull removed from the critical path. */
  strength?: number
  className?: string
}

/**
 * Passthrough wrapper — pointer magnetic pull used Framer + getBoundingClientRect
 * on every move and contributed to forced reflow / TBT. Visual CTA is unchanged.
 */
export function Magnetic({ children, className }: MagneticProps) {
  return <span className={cn('inline-block', className)}>{children}</span>
}
