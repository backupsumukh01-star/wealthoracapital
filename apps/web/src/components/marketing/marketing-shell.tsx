'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, type ReactNode } from 'react'

import { PageTransition } from '@/components/motion/page-transition'

import { CmsSiteOverlays } from './cms-site-overlays'
import { ForexTicker } from './forex-ticker'
import { PremiumAtmosphere } from './premium-atmosphere'
import { Footer } from './footer'
import { NavBar } from './nav-bar'

const AmbientParticles = dynamic(
  () => import('./ambient-particles').then((m) => m.AmbientParticles),
  { ssr: false },
)

const LiveActivityToasts = dynamic(
  () => import('./live-activity-toasts').then((m) => m.LiveActivityToasts),
  { ssr: false },
)

const CmsSeoEffects = dynamic(
  () => import('./cms-seo-effects').then((m) => m.CmsSeoEffects),
  { ssr: false },
)

function useIdleReady(timeoutMs: number) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const go = () => {
      if (!cancelled) setReady(true)
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(go, { timeout: timeoutMs })
      return () => {
        cancelled = true
        w.cancelIdleCallback?.(id)
      }
    }
    const t = globalThis.setTimeout(go, Math.min(timeoutMs, 400))
    return () => {
      cancelled = true
      globalThis.clearTimeout(t)
    }
  }, [timeoutMs])

  return ready
}

function IdleAmbientParticles() {
  const ready = useIdleReady(1400)
  if (!ready) return null
  return <AmbientParticles />
}

function IdleLiveActivityToasts() {
  const ready = useIdleReady(2400)
  if (!ready) return null
  return <LiveActivityToasts />
}

function IdleCmsSeoEffects() {
  // Analytics / title overrides after first paint — do not block LCP/TBT.
  const ready = useIdleReady(3000)
  if (!ready) return null
  return <CmsSeoEffects />
}

/**
 * Marketing chrome — sticky header + sticky ticker as one stack (in document flow),
 * so content never starts underneath and both stay visible while scrolling.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <PremiumAtmosphere />
      <IdleAmbientParticles />
      <IdleCmsSeoEffects />
      <CmsSiteOverlays />

      <div className="sticky top-0 z-50 w-full min-w-0">
        <NavBar />
        <ForexTicker />
      </div>

      <main id="main" className="relative z-0 min-w-0 flex-1">
        <PageTransition>{children}</PageTransition>
      </main>

      <Footer />
      <IdleLiveActivityToasts />
    </div>
  )
}
