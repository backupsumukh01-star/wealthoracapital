'use client'

import { useMemo, type ElementType } from 'react'
import { motion } from 'framer-motion'

/**
 * Resolves an element type to its motion equivalent, cached across renders.
 *
 * Calling `motion.create()` inline during render produces a new component identity every time,
 * which unmounts and remounts the entire subtree on each render — the animation restarts, focus
 * is lost, and any child state is destroyed. Memoising on `as` is what makes the polymorphic
 * wrappers safe.
 */
export function useMotionComponent(as: ElementType = 'div') {
  return useMemo(() => motion.create(as as 'div'), [as])
}
