'use client'

import type { ReactNode } from 'react'

import { PageTransition } from '@/components/motion/page-transition'

import { AmbientParticles } from './ambient-particles'
import { CmsSeoEffects } from './cms-seo-effects'
import { CmsSiteOverlays } from './cms-site-overlays'
import { ForexTicker } from './forex-ticker'
import { LiveActivityToasts } from './live-activity-toasts'
import { PremiumAtmosphere } from './premium-atmosphere'
import { Footer } from './footer'
import { NavBar } from './nav-bar'

/**
 * Marketing chrome — sticky header + sticky ticker as one stack (in document flow),
 * so content never starts underneath and both stay visible while scrolling.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <PremiumAtmosphere />
      <AmbientParticles />
      <CmsSeoEffects />
      <CmsSiteOverlays />

      <div className="sticky top-0 z-50 w-full min-w-0">
        <NavBar />
        <ForexTicker />
      </div>

      <main id="main" className="relative z-0 min-w-0 flex-1">
        <PageTransition>{children}</PageTransition>
      </main>

      <Footer />
      <LiveActivityToasts />
    </div>
  )
}
