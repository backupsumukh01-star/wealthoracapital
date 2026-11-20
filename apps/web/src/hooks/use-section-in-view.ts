'use client'

import { useEffect, useState } from 'react'

/**
 * True when `#id` intersects the viewport past `threshold`.
 * Used to quiet chrome (ticker / toasts) over focused marketing sections.
 */
export function useSectionInView(
  id: string,
  { threshold = 0.28, rootMargin = '-12% 0px -12% 0px' }: { threshold?: number; rootMargin?: string } = {},
) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = document.getElementById(id)
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) >= threshold))
      },
      { threshold: [0, threshold, 0.5, 0.75], rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [id, threshold, rootMargin])

  return inView
}
