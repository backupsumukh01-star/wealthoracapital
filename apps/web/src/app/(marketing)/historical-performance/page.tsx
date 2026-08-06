import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, LineChart } from 'lucide-react'

import { CtaBand } from '@/components/marketing/cta-band'
import { HistoricalPerformanceCenter } from '@/components/marketing/historical-performance-center'
import { PageHero } from '@/components/marketing/page-hero'
import { RiskBanner } from '@/components/marketing/risk-banner'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Historical Performance Center',
  description:
    'Explore the synthetic 3-year demo backtest: equity curve, monthly and daily returns, trade blotter, and downloadable reports. Demo data for presentation only.',
  alternates: { canonical: ROUTES.marketing.historicalPerformance },
}

/**
 * Marketing Historical Performance Center — powered by `/demo/backtest` JSON.
 * Distinct from the live public track record at `/performance`.
 */
export default function HistoricalPerformancePage() {
  return (
    <>
      <PageHero
        eyebrow="Historical Performance Center"
        title="Three years of synthetic desk activity, fully inspectable"
        description="Charts, settlements, and the trade blotter from the reproducible demo/backtest dataset. Fabricated for UI walkthroughs — not live trading history."
      >
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.performance}>
              <LineChart aria-hidden />
              Live track record
            </Link>
          </Button>
          <Button asChild size="lg" variant="glass" className="w-full sm:w-auto">
            <Link href={ROUTES.auth.register}>
              Start investing
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </PageHero>

      <HistoricalPerformanceCenter />

      <RiskBanner />
      <CtaBand />
    </>
  )
}
