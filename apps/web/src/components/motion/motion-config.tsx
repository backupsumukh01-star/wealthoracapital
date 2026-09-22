'use client'

import type { ReactNode } from 'react'
import { ComponentType, useEffect, useState } from 'react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

import { DURATION, EASE_IN_OUT, EASE_OUT, EASE_SPRING } from './motion-tokens'

export { DURATION, EASE_IN_OUT, EASE_OUT, EASE_SPRING }

type MotionConfigProps = {
  children?: ReactNode
  reducedMotion?: 'always' | 'never' | 'user'
  transition?: { duration: number; ease: readonly number[] }
}

/**
 * Lazy MotionConfig — avoids pulling framer-motion into the first paint graph.
 * Below-fold Framer components still work once this hydrates.
 */
export function MotionConfigProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [Config, setConfig] = useState<ComponentType<MotionConfigProps> | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void import('framer-motion').then((m) => {
        if (!cancelled) setConfig(() => m.MotionConfig as ComponentType<MotionConfigProps>)
      })
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(load, { timeout: 1800 })
      return () => {
        cancelled = true
        w.cancelIdleCallback?.(id)
      }
    }
    const t = globalThis.setTimeout(load, 1)
    return () => {
      cancelled = true
      globalThis.clearTimeout(t)
    }
  }, [])

  if (!Config) return <>{children}</>

  return (
    <Config
      reducedMotion={prefersReducedMotion ? 'always' : 'user'}
      transition={{ duration: 0.24, ease: EASE_OUT }}
    >
      {children}
    </Config>
  )
}
