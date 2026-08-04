import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

import { CtaBand } from '@/components/marketing/cta-band'
import { Hero } from '@/components/marketing/hero'
import { HomeFaq } from '@/components/marketing/home-faq'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { PerformanceHighlights } from '@/components/marketing/performance-highlights'
import { RiskBanner } from '@/components/marketing/risk-banner'
import { SITE } from '@/lib/constants'

const PerformanceShowcase = dynamic(
  () =>
    import('@/components/marketing/performance-showcase').then(
      (m) => m.PerformanceShowcase,
    ),
  { loading: () => <div className="section-y min-h-[28rem]" aria-hidden /> },
)
const TodaysMarkets = dynamic(
  () => import('@/components/marketing/todays-markets').then((m) => m.TodaysMarkets),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const TodaysTradingActivity = dynamic(
  () =>
    import('@/components/marketing/todays-trading-activity').then(
      (m) => m.TodaysTradingActivity,
    ),
  { loading: () => <div className="section-y min-h-[24rem]" aria-hidden /> },
)
const PerformanceProof = dynamic(
  () =>
    import('@/components/marketing/performance-proof').then((m) => m.PerformanceProof),
  { loading: () => <div className="section-y min-h-[22rem]" aria-hidden /> },
)
const Testimonials = dynamic(
  () => import('@/components/marketing/testimonials').then((m) => m.Testimonials),
  { loading: () => <div className="section-y min-h-[20rem]" aria-hidden /> },
)
const GlobalFootprintLazy = dynamic(
  () =>
    import('@/components/marketing/global-footprint-section').then(
      (m) => m.GlobalFootprintSection,
    ),
  { loading: () => <div className="section-y min-h-[28rem]" aria-hidden /> },
)

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: '/' },
}

/**
 * Premium conversion landing — Growzy branding, original IA without oversized feature grid.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <PerformanceHighlights />
      <PerformanceShowcase />
      <HowItWorks />
      <TodaysMarkets />
      <TodaysTradingActivity />
      <PerformanceProof />
      <Testimonials />
      <GlobalFootprintLazy />
      <HomeFaq />
      <RiskBanner />
      <CtaBand />
    </>
  )
}
