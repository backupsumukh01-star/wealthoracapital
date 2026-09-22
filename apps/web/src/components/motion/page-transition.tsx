'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

import { cn } from '@/lib/cn'

import { DURATION, EASE_OUT } from './motion-config'

/**
 * Fade on route change only — no transform.
 * Transforms on this wrapper would break sticky header stacking and cause overlap bugs.
 * Homepage skips the fade so the LCP headline is not held at opacity 0.
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

  if (isHome) {
    return <div className={cn('relative z-0 min-w-0', className)}>{children}</div>
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.normal, ease: EASE_OUT }}
      className={cn('relative z-0 min-w-0', className)}
    >
      {children}
    </motion.div>
  )
}
