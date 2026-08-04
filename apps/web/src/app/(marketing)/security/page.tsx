import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, Clock3 } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { RiskBanner } from '@/components/marketing/risk-banner'
import { CapitalProtection } from '@/components/marketing/trading-system/capital-protection'
import { ImportantNotice } from '@/components/marketing/trading-system/important-notice'
import { RiskManagementPanel } from '@/components/marketing/trading-system/risk-management'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Security',
  description:
    'Multi-layer risk controls, human review, capital protection, monitoring, audit trails, and withdrawal verification.',
  alternates: { canonical: ROUTES.marketing.security },
}

const TIMELINE = [
  { title: 'Signal received', detail: 'AI ranks a setup against session context.' },
  { title: 'Risk gates', detail: 'Size, stop, and book limits must all pass.' },
  { title: 'Human review', detail: 'Desk can pause or reject before execution.' },
  { title: 'Position watch', detail: 'Open risk monitored until the ticket closes.' },
  { title: 'Daily verify', detail: 'Published return requires operator sign-off.' },
  { title: 'Withdrawal check', detail: 'Payouts reconcile against ledger truth.' },
]

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="Controls that contain risk — not eliminate it"
        description="Capital is always exposed to markets. These layers exist so no single unchecked ticket can define the book."
      >
        <Button asChild size="lg" className="mt-2 w-full sm:w-auto">
          <Link href={ROUTES.marketing.legal.riskDisclosure}>
            Read risk disclosure
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </PageHero>

      <div className="container-page space-y-16 pb-8 sm:space-y-20">
        <RiskManagementPanel />
        <CapitalProtection />
      </div>

      <Section
        eyebrow="Security timeline"
        title="From signal to payout check"
        description="Control sequence overview — not a guarantee of outcomes."
        backdrop="grid"
      >
        <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TIMELINE.map((step, i) => (
            <StaggerItem key={step.title}>
              <article className="card-fill h-full p-5">
                <div className="flex items-center gap-2 text-accent-300">
                  <Clock3 className="size-4" aria-hidden />
                  <span className="text-overline">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 className="text-heading-sm mt-3 text-fg">{step.title}</h2>
                <p className="mt-2 text-body-sm text-fg-muted">{step.detail}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <div className="container-page pb-10">
        <ImportantNotice />
      </div>

      <RiskBanner />
      <CtaBand />
    </>
  )
}
