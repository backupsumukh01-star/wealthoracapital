import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CtaBand } from '@/components/marketing/cta-band'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { DailySettlementFlow, MoneyMovementFlows } from '@/components/marketing/money-flows'
import { PageHero } from '@/components/marketing/page-hero'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'From deposit to daily settlement to withdrawal — the full mechanism, including what happens on a losing day.',
  alternates: { canonical: ROUTES.marketing.howItWorks },
}

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="Mechanism"
        title="What actually happens to your money"
        description="Every stage, in order, spelling out the parts most platforms leave vague."
      >
        <Button asChild size="lg" className="mt-2 w-full sm:w-auto">
          <Link href={ROUTES.auth.register}>
            Open an account
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </PageHero>

      <HowItWorks />

      <Section
        eyebrow="Settlement"
        title="How the daily return reaches your balance"
        description="One figure per trading day, applied to every eligible balance in a single atomic run. If any part of the run fails, none of it is applied."
      >
        <DailySettlementFlow />
      </Section>

      <Section
        eyebrow="Money movement"
        title="Deposits and withdrawals"
        description="Both are reviewed by a person, and both leave a permanent record of who decided what and when."
        backdrop="grid"
      >
        <MoneyMovementFlows />
      </Section>
      <CtaBand />
    </>
  )
}
