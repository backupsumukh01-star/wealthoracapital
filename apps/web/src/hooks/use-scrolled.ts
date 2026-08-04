'use client'

import { useEffect, useState } from 'react'

/**
 * True once the window has scrolled past `threshold` pixels.
 *
 * The listener is passive and the state only flips on a boundary crossing, so a long scroll
 * causes one render rather than one per frame.
 */
export function useScrolled(threshold = 12): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => {
      setScrolled((current) => {
        const next = window.scrollY > threshold
        return next === current ? current : next
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [threshold])

  return scrolled
}
