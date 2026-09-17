import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { TradingSystemSection } from '@/components/marketing/trading-system'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Our Trading System',
  description:
    'How Wealthora generates published returns: AI scanning, human review, strategy selection, risk gates, and daily distribution.',
  alternates: { canonical: ROUTES.marketing.ourTradingSystem },
}

export default function OurTradingSystemPage() {
  return (
    <>
      <PageHero
        eyebrow="Our trading system"
        title="Discipline before every published return"
        description="A full visual walkthrough of workflow, strategies, risk, sessions, and capital protection — the deep dive behind the homepage summary."
      >
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={ROUTES.auth.register}>
              Start investing
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.performance}>Inspect performance</Link>
          </Button>
        </div>
      </PageHero>

      <TradingSystemSection showIntro={false} />
      <CtaBand />
    </>
  )
}
