import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight } from 'lucide-react'

import { Section } from '@/components/common/section'
import { AdvantagesGrid } from '@/components/marketing/advantages-grid'
import { CtaBand } from '@/components/marketing/cta-band'
import { DistributionsStrip } from '@/components/marketing/distributions-strip'
import { PageHero } from '@/components/marketing/page-hero'
import { RiskBanner } from '@/components/marketing/risk-banner'
import { StatsBand } from '@/components/marketing/stats-band'
import { Testimonials } from '@/components/marketing/testimonials'
import { TrustLogos } from '@/components/marketing/trust-logos'
import { TrustStrip } from '@/components/marketing/trust-strip'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Investors',
  description:
    'Community stories, global footprint, investor statistics, and success narratives from the Growzy programme.',
  alternates: { canonical: ROUTES.marketing.investors },
}

export default function InvestorsPage() {
  return (
    <>
      <PageHero
        eyebrow="Investors"
        title="A global community inspecting the same tape"
        description="Statistics, hub activity, and testimonials — illustrative for presentation, designed to match how Growzy talks about community."
      >
        <Button asChild size="lg" className="mt-2 w-full sm:w-auto">
          <Link href={ROUTES.auth.register}>
            Join as an investor
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </PageHero>

      <TrustStrip />
      <StatsBand />
      <TrustLogos />
      <Testimonials />
      <DistributionsStrip />
      <AdvantagesGrid />

      <Section centered className="!pt-0">
        <Button asChild size="lg" variant="secondary">
          <Link href={ROUTES.marketing.transparency}>
            Inspect transparency
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </Section>

      <RiskBanner />
      <CtaBand />
    </>
  )
}
