'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export interface MagneticProps {
  children: ReactNode
  /** Maximum pull, in pixels. Kept small — this should be felt, not seen. */
  strength?: number
  className?: string
}

/** A pointer-following pull on the hero's primary CTA. Pointer-only, and never on touch. */
export function Magnetic({ children, strength = 8, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 })

  if (prefersReducedMotion) {
    return <span className={cn('inline-block', className)}>{children}</span>
  }

  return (
    <motion.span
      ref={ref}
      style={{ x: springX, y: springY }}
      className={cn('inline-block', className)}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return
        const bounds = ref.current?.getBoundingClientRect()
        if (!bounds) return
        const offsetX = event.clientX - (bounds.left + bounds.width / 2)
        const offsetY = event.clientY - (bounds.top + bounds.height / 2)
        x.set((offsetX / bounds.width) * strength * 2)
        y.set((offsetY / bounds.height) * strength * 2)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.span>
  )
}
