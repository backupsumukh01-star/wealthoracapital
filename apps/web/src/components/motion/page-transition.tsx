'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

import { cn } from '@/lib/cn'

import { DURATION, EASE_OUT } from './motion-config'

/**
 * Fade on route change only — no transform.
 * Transforms on this wrapper would break sticky header stacking and cause overlap bugs.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()

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
