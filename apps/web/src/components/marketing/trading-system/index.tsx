'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { Section } from '@/components/common/section'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

import { CapitalProtection } from './capital-protection'
import { ImportantNotice } from './important-notice'
import { TradeLifecycle } from './lifecycle'
import { PerformanceTransparency } from './performance-transparency'
import { RiskManagementPanel } from './risk-management'
import { TradingSessionsMap } from './sessions-map'
import { StrategyEngine } from './strategies'
import { TechnologyStack } from './tech-stack'
import { WhyWePublish } from './why-publish'
import { TradingWorkflow } from './workflow'

/** Premium deep-dive: how Growzy’s trading system works — visual, interactive, demo-only. */
export function TradingSystemSection({
  showIntro = true,
}: {
  /** When false, skip the outer section masthead (use with PageHero). */
  showIntro?: boolean
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [glow, setGlow] = useState({ x: 50, y: 20 })

  useEffect(() => {
    if (prefersReducedMotion) return
    const el = rootRef.current
    if (!el) return
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      setGlow({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      })
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    return () => el.removeEventListener('pointermove', onMove)
  }, [prefersReducedMotion])

  return (
    <Section
      id="trading-system"
      eyebrow={showIntro ? 'How our trading system works' : undefined}
      title={showIntro ? 'Discipline before every published return' : undefined}
      description={
        showIntro
          ? 'A visual walkthrough of workflow, risk, sessions, and transparency — built for clarity, not slogans.'
          : undefined
      }
      centered={showIntro}
      backdrop="grid"
      className="!overflow-hidden"
    >
      <div ref={rootRef} className="relative mx-auto max-w-6xl space-y-12 sm:space-y-16 lg:space-y-24">
        {/* Section-local mouse glow + particles */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          {!prefersReducedMotion ? (
            <motion.div
              className="absolute size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${glow.x}%`,
                top: `${glow.y}%`,
                background:
                  'radial-gradient(circle, rgb(18 214 160 / 0.14) 0%, transparent 68%)',
              }}
            />
          ) : null}
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
          {!prefersReducedMotion
            ? Array.from({ length: 14 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute size-1 rounded-full bg-accent-300/40"
                  style={{
                    left: `${8 + ((i * 17) % 84)}%`,
                    top: `${12 + ((i * 23) % 76)}%`,
                  }}
                  animate={{ y: [0, -12, 0], opacity: [0.15, 0.55, 0.15] }}
                  transition={{
                    duration: 5 + (i % 4),
                    delay: i * 0.35,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))
            : null}
        </div>

        <TradingWorkflow />
        <StrategyEngine />
        <RiskManagementPanel />
        <TradeLifecycle />
        <WhyWePublish />
        <TechnologyStack />
        <TradingSessionsMap />
        <CapitalProtection />
        <PerformanceTransparency />
        <ImportantNotice />
      </div>
    </Section>
  )
}

export { TradingSystemSection as HowTradingSystemWorks }
