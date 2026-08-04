import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Download } from 'lucide-react'

import { CtaBand } from '@/components/marketing/cta-band'
import { InvestmentCalculator } from '@/components/marketing/investment-calculator'
import { InvestmentTimeline } from '@/components/marketing/investment-timeline'
import { LiveTradesPreview } from '@/components/marketing/live-trades-preview'
import { PageHero } from '@/components/marketing/page-hero'
import { PerformanceShowcase } from '@/components/marketing/performance-showcase'
import { RiskBanner } from '@/components/marketing/risk-banner'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Track record',
  description:
    'The public performance record: daily returns, monthly breakdown, trade history, and growth tools. Past performance does not guarantee future results.',
  alternates: { canonical: ROUTES.marketing.performance },
}

/**
 * Public track record — SEO-critical. Investor personal ROI remains at /my-performance.
 */
export default function PerformancePage() {
  return (
    <>
      <PageHero
        eyebrow="Track record"
        title="Everything the desk has done, including the bad days"
        description="Generated from the same illustrative ledger pattern investors will reconcile in-product. Losing periods are not smoothed or rebased."
      >
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.transparency}>
              <Download aria-hidden />
              View reports archive
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

      <PerformanceShowcase showPageLinks={false} />
      <LiveTradesPreview />
      <InvestmentCalculator />
      <InvestmentTimeline />

      <RiskBanner />
      <CtaBand />
    </>
  )
}
