import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Server } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CtaBand } from '@/components/marketing/cta-band'
import { FeatureMosaic } from '@/components/marketing/feature-mosaic'
import { ForexPairCards } from '@/components/marketing/forex-pair-cards'
import { LiveMarketWidget } from '@/components/marketing/live-market-widget'
import { PageHero } from '@/components/marketing/page-hero'
import { StrategyEngine } from '@/components/marketing/trading-system/strategies'
import { TechnologyStack } from '@/components/marketing/trading-system/tech-stack'
import { TradeLifecycle } from '@/components/marketing/trading-system/lifecycle'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Technology',
  description:
    'Architecture overview: AI signal analysis, market scanner, execution engine, risk engine, analytics, and infrastructure.',
  alternates: { canonical: ROUTES.marketing.technology },
}

export default function TechnologyPage() {
  return (
    <>
      <PageHero
        eyebrow="Technology"
        title="Infrastructure built for careful sessions"
        description="Engines for scan, risk, execute, and publish — presented as product surfaces, not a pitch deck."
      >
        <Button asChild size="lg" variant="secondary" className="mt-2 w-full sm:w-auto">
          <Link href={ROUTES.marketing.ourTradingSystem}>
            See the trading system
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </PageHero>

      <div className="container-page space-y-16 pb-6 sm:space-y-20">
        <TechnologyStack />
        <StrategyEngine />
        <TradeLifecycle />
      </div>

      <FeatureMosaic />
      <LiveMarketWidget />
      <ForexPairCards />

      <Section
        eyebrow="Infrastructure"
        title="Operational posture"
        description="Principles for how Wealthora presents reliability and observability."
        centered
      >
        <div className="card-fill mx-auto flex max-w-2xl flex-col items-start gap-4 p-6 text-left sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl border border-line bg-accent-500/10 text-accent-300">
            <Server className="size-5" aria-hidden />
          </span>
          <p className="text-heading-md text-fg">Ledger-first architecture</p>
          <p className="text-body-sm text-fg-muted sm:text-body-md">
            Distributions, trades, and wallet movements are recorded as durable events. Marketing
            charts read from the same illustrative dataset investors will eventually reconcile in
            product — never a separate “marketing number.”
          </p>
        </div>
      </Section>
      <CtaBand />
    </>
  )
}
