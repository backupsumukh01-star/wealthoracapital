'use client'

/**
 * Landing sections gated by Frontend CMS `section.visible` flags.
 * Does not redesign the page — only wraps existing marketing components.
 * Heavy / below-the-fold sections are dynamically imported so the hero LCP path stays light.
 */

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight } from 'lucide-react'

import { DeferredMount } from '@/components/marketing/deferred-mount'
import { Hero } from '@/components/marketing/hero'
import { TrustStrip } from '@/components/marketing/trust-strip'
import { Button } from '@/components/ui/button'
import { usePublishedFrontend } from '@/features/cms/frontend-hooks'

function HistoryCtaBand() {
  const { getSection } = usePublishedFrontend()
  const section = getSection('downloads')
  return (
    <div className="container-page section-y">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-caption uppercase tracking-wider text-accent-300">
          {section?.eyebrow || 'Historical Performance'}
        </p>
        <h2 className="mt-2 text-heading-md text-fg">
          {section?.title || 'Explore the full 4-year track record'}
        </h2>
        {section?.description ? (
          <p className="mt-2 text-body-sm text-fg-muted">{section.description}</p>
        ) : (
          <p className="mt-2 text-body-sm text-fg-muted">
            Charts, trade blotter and downloadable reports live on the Historical Performance page.
          </p>
        )}
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.historicalPerformance}>
              Explore Historical Performance
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.historicalPerformance}>
              Browse Performance History
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

const StatsBand = dynamic(
  () => import('@/components/marketing/stats-band').then((m) => m.StatsBand),
  { loading: () => <div className="section-y min-h-[12rem]" aria-hidden /> },
)
const PerformanceHighlights = dynamic(
  () =>
    import('@/components/marketing/performance-highlights').then(
      (m) => m.PerformanceHighlights,
    ),
  { loading: () => <div className="section-y min-h-[16rem]" aria-hidden /> },
)
const PerformanceShowcase = dynamic(
  () =>
    import('@/components/marketing/performance-showcase').then((m) => m.PerformanceShowcase),
  { loading: () => <div className="section-y min-h-[28rem]" aria-hidden /> },
)
const WhyChooseUs = dynamic(
  () => import('@/components/marketing/why-choose-us').then((m) => m.WhyChooseUs),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const FeatureMosaic = dynamic(
  () => import('@/components/marketing/feature-mosaic').then((m) => m.FeatureMosaic),
  { loading: () => <div className="section-y min-h-[24rem]" aria-hidden /> },
)
const OperatingModel = dynamic(
  () => import('@/components/marketing/operating-model').then((m) => m.OperatingModel),
  { loading: () => <div className="section-y min-h-[16rem]" aria-hidden /> },
)
const StrategyEngine = dynamic(
  () =>
    import('@/components/marketing/trading-system/strategies').then((m) => m.StrategyEngine),
  { loading: () => <div className="section-y min-h-[24rem]" aria-hidden /> },
)
const HowItWorks = dynamic(
  () => import('@/components/marketing/how-it-works').then((m) => m.HowItWorks),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const InvestmentTimeline = dynamic(
  () =>
    import('@/components/marketing/investment-timeline').then((m) => m.InvestmentTimeline),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const RiskManagementPanel = dynamic(
  () =>
    import('@/components/marketing/trading-system/risk-management').then(
      (m) => m.RiskManagementPanel,
    ),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const TodaysMarkets = dynamic(
  () => import('@/components/marketing/todays-markets').then((m) => m.TodaysMarkets),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const LiveTradesPreview = dynamic(
  () => import('@/components/marketing/live-trades-preview').then((m) => m.LiveTradesPreview),
  { loading: () => <div className="section-y min-h-[24rem]" aria-hidden /> },
)
const PerformanceProof = dynamic(
  () => import('@/components/marketing/performance-proof').then((m) => m.PerformanceProof),
  { loading: () => <div className="section-y min-h-[22rem]" aria-hidden /> },
)
const Testimonials = dynamic(
  () => import('@/components/marketing/testimonials').then((m) => m.Testimonials),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const DistributionsStrip = dynamic(
  () =>
    import('@/components/marketing/distributions-strip').then((m) => m.DistributionsStrip),
  { loading: () => <div className="section-y min-h-[28rem]" aria-hidden /> },
)
const GlobalFootprintLazy = dynamic(
  () =>
    import('@/components/marketing/global-footprint-section').then(
      (m) => m.GlobalFootprintSection,
    ),
  { loading: () => <div className="section-y min-h-[28rem]" aria-hidden /> },
)
const HomeFaq = dynamic(
  () => import('@/components/marketing/home-faq').then((m) => m.HomeFaq),
  { loading: () => <div className="section-y min-h-[16rem]" aria-hidden /> },
)
const CtaBand = dynamic(
  () => import('@/components/marketing/cta-band').then((m) => m.CtaBand),
  { loading: () => <div className="section-y min-h-[12rem]" aria-hidden /> },
)

function Gate({
  sectionKey,
  visible,
  children,
}: {
  sectionKey: string
  visible: (key: string) => boolean
  children: ReactNode
}) {
  if (!visible(sectionKey)) return null
  return <>{children}</>
}

export function LandingSections() {
  const { isSectionVisible } = usePublishedFrontend()

  return (
    <>
      <Gate sectionKey="hero" visible={isSectionVisible}>
        <Hero />
      </Gate>
      <TrustStrip />
      <Gate sectionKey="statistics" visible={isSectionVisible}>
        <StatsBand />
      </Gate>
      <Gate sectionKey="performance" visible={isSectionVisible}>
        <PerformanceHighlights />
        <PerformanceShowcase />
      </Gate>
      <Gate sectionKey="why_choose_us" visible={isSectionVisible}>
        <WhyChooseUs />
      </Gate>
      <Gate sectionKey="features" visible={isSectionVisible}>
        <FeatureMosaic />
      </Gate>

      <Gate sectionKey="trading_strategy" visible={isSectionVisible}>
        <div className="container-page pb-6 sm:pb-10">
          <OperatingModel />
        </div>
        <div className="container-page space-y-16 pb-6 sm:space-y-20">
          <StrategyEngine />
        </div>
      </Gate>

      <Gate sectionKey="how_it_works" visible={isSectionVisible}>
        <HowItWorks />
      </Gate>
      <Gate sectionKey="timeline" visible={isSectionVisible}>
        <InvestmentTimeline />
      </Gate>

      <Gate sectionKey="security" visible={isSectionVisible}>
        <div className="container-page space-y-16 pb-8 sm:space-y-20">
          <RiskManagementPanel />
        </div>
      </Gate>

      <Gate sectionKey="markets" visible={isSectionVisible}>
        <TodaysMarkets />
        <DeferredMount
          minHeight="28rem"
          fallback={<div className="section-y min-h-[24rem]" aria-hidden />}
        >
          <LiveTradesPreview />
        </DeferredMount>
      </Gate>

      <Gate sectionKey="performance" visible={isSectionVisible}>
        <PerformanceProof />
      </Gate>

      <Gate sectionKey="testimonials" visible={isSectionVisible}>
        <Testimonials />
      </Gate>
      <DistributionsStrip />
      <GlobalFootprintLazy />
      <Gate sectionKey="faq" visible={isSectionVisible}>
        <HomeFaq />
      </Gate>

      <Gate sectionKey="downloads" visible={isSectionVisible}>
        <HistoryCtaBand />
      </Gate>
      <Gate sectionKey="cta" visible={isSectionVisible}>
        <CtaBand />
      </Gate>
    </>
  )
}
