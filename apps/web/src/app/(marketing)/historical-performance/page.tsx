import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, LineChart } from 'lucide-react'

import { CtaBand } from '@/components/marketing/cta-band'
import { HistoricalPerformanceCenter } from '@/components/marketing/historical-performance-center'
import { PageHero } from '@/components/marketing/page-hero'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Historical Performance',
  description:
    '3-Year Verified Demo Backtest: equity curve, monthly and daily returns, trade blotter, and downloadable reports.',
  alternates: { canonical: ROUTES.marketing.historicalPerformance },
}

/**
 * Marketing Historical Performance Center — public API + seeded desk history.
 */
export default function HistoricalPerformancePage() {
  return (
    <>
      <PageHero
        eyebrow="Historical Performance"
        title="3-Year Verified Demo Backtest"
        description="Charts, settlements, and the trade blotter from the published programme ledger. Presentation dataset — not a guarantee of future results."
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
      <CtaBand />
    </>
  )
}
