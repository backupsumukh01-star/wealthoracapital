'use client'

import { useRef, type ReactNode } from 'react'

import { useNearViewport } from '@/hooks/use-near-viewport'

/** Renders `children` only after the sentinel enters (or nears) the viewport. */
export function DeferredMount({
  children,
  rootMargin = '360px 0px',
  fallback = null,
  minHeight,
}: {
  children: ReactNode
  rootMargin?: string
  fallback?: ReactNode
  minHeight?: string | number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const near = useNearViewport(ref, { rootMargin })

  return (
    <div ref={ref} style={minHeight != null ? { minHeight } : undefined}>
      {near ? children : fallback}
    </div>
  )
}
