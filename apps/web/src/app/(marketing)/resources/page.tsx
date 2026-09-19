import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  HelpCircle,
  Lightbulb,
  Newspaper,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { CmsReportDownloads } from '@/components/marketing/cms-report-downloads'
import { CtaBand } from '@/components/marketing/cta-band'
import { FaqAccordion } from '@/components/marketing/faq-accordion'
import { PageHero } from '@/components/marketing/page-hero'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Button } from '@/components/ui/button'
import { LANDING_FAQS } from '@/lib/landing-data'

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'FAQ, guides, glossary, downloads and market insights for Wealthora investors.',
  alternates: { canonical: ROUTES.marketing.resources },
}

const HUBS = [
  {
    title: 'FAQ',
    body: 'Deposits, returns, withdrawals and risk — answered plainly.',
    href: ROUTES.marketing.faq,
    icon: HelpCircle,
  },
  {
    title: 'Guides',
    body: 'How to fund, read the tape and request a withdrawal.',
    href: ROUTES.marketing.howItWorks,
    icon: BookOpen,
  },
  {
    title: 'Downloads',
    body: 'Report packs and statement formats you can download.',
    href: ROUTES.marketing.performance,
    icon: Download,
  },
  {
    title: 'Glossary',
    body: 'Desk language: distribution, eligibility, lock, drawdown.',
    href: ROUTES.marketing.faq,
    icon: FileText,
  },
  {
    title: 'Market insights',
    body: 'Session context notes — educational, not advice.',
    href: ROUTES.marketing.technology,
    icon: Lightbulb,
  },
  {
    title: 'Blog',
    body: 'Product updates and operating notes as they publish.',
    href: ROUTES.marketing.about,
    icon: Newspaper,
  },
]

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Learn before you allocate"
        description="Help centre, downloads and guides — keep the homepage short; keep the answers here."
      />

      <Section eyebrow="Library" title="Where to go next">
        <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HUBS.map((item) => (
            <StaggerItem key={item.title}>
              <Link
                href={item.href}
                className="card-fill group flex h-full flex-col p-5 transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="grid size-11 place-items-center rounded-2xl border border-line bg-accent-500/10 text-accent-300">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <h2 className="text-heading-sm mt-4 text-fg">{item.title}</h2>
                <p className="mt-2 flex-1 text-body-sm text-fg-muted">{item.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-caption text-accent-300">
                  Open
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section
        eyebrow="Downloads"
        title="Published reports"
        description="Monthly, weekly and performance packs published by operations — download instantly."
      >
        <CmsReportDownloads />
      </Section>

      <Section
        id="faq"
        eyebrow="FAQ"
        title="Full question set"
        description="Same answers as the help centre — structured for search."
        centered
      >
        <div className="mx-auto w-full max-w-3xl min-w-0">
          <FaqAccordion items={[...LANDING_FAQS]} />
        </div>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="secondary" size="lg">
            <Link href={ROUTES.marketing.contact}>
              Still need help?
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </Section>
      <CtaBand />
    </>
  )
}
