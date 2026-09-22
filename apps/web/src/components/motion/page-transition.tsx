'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'

/**
 * Route fade without Framer Motion — keeps the marketing shell off the framer chunk.
 * Homepage stays unanimated so LCP text is never delayed.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const isHome = pathname === '/' || pathname === ''

  return (
    <div
      key={pathname}
      className={cn(
        'relative z-0 min-w-0',
        !isHome && 'animate-fade-in',
        className,
      )}
    >
      {children}
    </div>
  )
}
