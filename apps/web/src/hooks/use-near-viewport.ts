'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * Becomes true once `ref` is within `rootMargin` of the viewport (once).
 * Used to defer heavy data fetches / chart mounts until near visible.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  options?: { rootMargin?: string; enabled?: boolean },
) {
  const rootMargin = options?.rootMargin ?? '200px 0px'
  const enabled = options?.enabled ?? true
  const [near, setNear] = useState(false)

  useEffect(() => {
    if (!enabled || near) return
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, near, ref, rootMargin])

  return near
}
