import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, FileSearch, History, ListTree, ShieldCheck } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CtaBand } from '@/components/marketing/cta-band'
import { LiveTradesPreview } from '@/components/marketing/live-trades-preview'
import { PageHero } from '@/components/marketing/page-hero'
import { WhyWePublish } from '@/components/marketing/trading-system/why-publish'
import { PerformanceTransparency } from '@/components/marketing/trading-system/performance-transparency'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Transparency',
  description:
    'Inspect published trades, historical ledgers, withdrawal records, and the verification process behind every daily return.',
  alternates: { canonical: ROUTES.marketing.transparency },
}

const PROOFS = [
  {
    icon: ListTree,
    title: 'Published trades',
    body: 'Pair, direction, entry, exit, and return for tickets behind each day.',
  },
  {
    icon: History,
    title: 'Historical ledger',
    body: 'Deposits, distributions, and withdrawals remain append-only.',
  },
  {
    icon: FileSearch,
    title: 'Audit logs',
    body: 'Operator actions that approve deposits or apply returns are attributed.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification process',
    body: 'No percentage publishes until the desk confirms the closed session.',
  },
]

export default function TransparencyPage() {
  return (
    <>
      <PageHero
        eyebrow="Transparency"
        title="Proof you can inspect — not slogans"
        description="Trade history, ledgers, and withdrawal records are available so you can reconcile published results yourself."
      >
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.historicalPerformance}>
              Explore Historical Performance
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="glass" className="w-full sm:w-auto">
            <Link href={ROUTES.auth.register}>
              Open an account
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </PageHero>

      <Section
        eyebrow="Proof of transparency"
        title="What you can verify"
        description="Surfaces that mirror how Wealthora presents auditability in-product."
      >
        <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROOFS.map((item) => (
            <StaggerItem key={item.title}>
              <article className="card-fill h-full p-5">
                <span className="grid size-11 place-items-center rounded-2xl border border-line bg-accent-500/10 text-accent-300">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <h2 className="text-heading-sm mt-4 text-fg">{item.title}</h2>
                <p className="mt-2 text-body-sm text-fg-muted">{item.body}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <div className="container-page pb-4">
        <WhyWePublish />
      </div>

      <LiveTradesPreview />

      <div className="container-page section-y pt-0">
        <PerformanceTransparency />
      </div>
      <CtaBand />
    </>
  )
}
