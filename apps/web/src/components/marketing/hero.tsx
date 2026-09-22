'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, BadgeCheck, Lock, Shield } from 'lucide-react'

import { LogoMark } from '@/components/common/logo'
import { CountUp } from '@/components/motion/count-up'
import { FadeIn } from '@/components/motion/fade-in'
import { Magnetic } from '@/components/motion/magnetic'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useLandingLiveStats } from '@/features/landing'
import { usePublishedLanding } from '@/features/cms/site'

import { HeroMarketCards } from './hero-market-cards'
import { HistoricalNote } from './historical-note'

const HeroVisual = dynamic(
  () => import('./hero-visual').then((m) => m.HeroVisual),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-[16/9] w-full animate-pulse rounded-2xl border border-glass-line bg-raised/40"
        aria-hidden
      />
    ),
  },
)

const TRUST = [
  { label: 'Published trade history', icon: BadgeCheck },
  { label: 'Operator-verified days', icon: Shield },
  { label: 'Withdraw anytime', icon: Lock },
] as const

const DEMO = {
  companyName: 'Wealthora',
  heroTitle: 'Forex investing with every trade on record',
  heroSubtitle:
    'AI-assisted strategies, human-verified results and transparent historical performance.',
  heroPrimaryCta: 'Start Investing',
  heroSecondaryCta: 'View Historical Performance',
} as const

/** Premium centered hero — no Framer Motion on the critical path. */
export function Hero() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { landing: cms } = usePublishedLanding()
  const { stats: live } = useLandingLiveStats()
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const companyName = cms.companyName?.trim() || DEMO.companyName
  const heroTitle = cms.heroTitle?.trim() || DEMO.heroTitle
  const heroSubtitle = cms.heroSubtitle?.trim() || DEMO.heroSubtitle
  const heroPrimaryCta = cms.heroPrimaryCta?.trim() || DEMO.heroPrimaryCta
  const heroSecondaryCta = cms.heroSecondaryCta?.trim() || DEMO.heroSecondaryCta

  const intensity = Math.max(0.85, cms.heroMotion?.intensity ?? 1)
  const isDesktop = isMobile === false
  const showGlow =
    isDesktop && !prefersReducedMotion && cms.heroMotion?.glowEnabled !== false

  const stats: {
    label: string
    value: string
    prefix?: string
    suffix?: string
    decimals?: number
  }[] = [
    {
      label: 'Investors',
      value: live.investors,
      suffix: '+',
      decimals: 0,
    },
    {
      label: 'AUM',
      value: live.aumMillions,
      prefix: '$',
      suffix: 'M',
      decimals: 2,
    },
    {
      label: 'Avg monthly',
      value: live.avgMonthlyReturn,
      suffix: '%',
      decimals: 1,
    },
    {
      label: 'Win rate',
      value: live.winRate,
      suffix: '%',
      decimals: 1,
    },
  ]

  return (
    <section className="relative isolate overflow-x-clip overflow-y-hidden pb-14 pt-10 sm:pb-20 sm:pt-14 lg:pb-28 lg:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-base" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-20" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh]"
        style={{
          background: `radial-gradient(80% 55% at 50% 0%, rgb(212 217 223 / ${0.10 * intensity}) 0%, transparent 70%)`,
        }}
      />
      {showGlow ? (
        <>
          <div
            className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent-500/15 blur-3xl motion-safe:animate-float"
            style={{ opacity: 0.45 * intensity }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-16 top-[40%] -z-10 h-64 w-64 rounded-full bg-hl-cyan/10 blur-3xl motion-safe:animate-float"
            style={{ opacity: 0.35 * intensity, animationDuration: '14s' }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 top-32 -z-10 h-72 w-72 rounded-full bg-hl-violet/10 blur-3xl motion-safe:animate-float"
            style={{ opacity: 0.3 * intensity, animationDuration: '12s', animationDelay: '1s' }}
            aria-hidden
          />
        </>
      ) : null}

      <div className="container-page flex min-w-0 flex-col items-center text-center">
        <div className="mb-7 flex flex-col items-center gap-3.5 sm:mb-8 sm:gap-4">
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-6 rounded-full bg-[#D4D9DF]/10 blur-2xl"
              aria-hidden
            />
            <LogoMark className="relative size-16 sm:size-[4.5rem]" />
          </div>
          <p className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
            <span className="bg-gradient-to-r from-[#C4CBD3] via-[#D4D9DF] to-[#F2F4F7] bg-clip-text text-transparent">
              {companyName || SITE.wordmark.primary}
            </span>
          </p>
        </div>

        {/* LCP candidates — paint immediately */}
        <h1 className="text-display-xl max-w-4xl break-words text-fg">
          {heroTitle.includes('every trade') ? (
            <>
              Forex investing with
              <span className="text-gradient block">every trade on record</span>
            </>
          ) : (
            heroTitle
          )}
        </h1>

        <p className="prose-measure mx-auto mt-5 max-w-[40ch] text-body-md text-fg-muted sm:mt-6 sm:max-w-none sm:text-body-lg">
          {heroSubtitle}
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center">
          <Magnetic>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={ROUTES.auth.register}>
                {heroPrimaryCta}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Magnetic>
          <Button asChild size="lg" variant="glass" className="w-full sm:w-auto">
            <Link href={ROUTES.marketing.performance}>{heroSecondaryCta}</Link>
          </Button>
        </div>

        <FadeIn delay={0.08}>
          <ul className="mt-7 flex max-w-xl flex-wrap items-center justify-center gap-2 sm:mt-8">
            {TRUST.map((t) => (
              <li
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-glass-line bg-glass/50 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur-md sm:text-caption"
              >
                <t.icon className="size-3.5 text-accent-300" aria-hidden />
                {t.label}
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.12} className="mt-8 w-full max-w-3xl sm:mt-9">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="card-fill px-3 py-3 text-left sm:px-4 sm:py-3.5"
              >
                <p className="text-[11px] text-fg-subtle sm:text-caption">{stat.label}</p>
                <p className="mt-1 text-stat-md text-fg sm:text-stat-lg">
                  <CountUp
                    value={stat.value}
                    prefix={stat.prefix ?? ''}
                    suffix={stat.suffix ?? ''}
                    decimals={stat.decimals ?? 0}
                  />
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.16} className="mt-8 w-full max-w-3xl sm:mt-10">
          <HeroMarketCards />
        </FadeIn>
      </div>

      <FadeIn delay={0.2} y={28} className="container-page mt-12 sm:mt-14 lg:mt-16">
        <div className="relative mx-auto max-w-5xl">
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent-500/10 blur-3xl sm:-inset-10"
            aria-hidden
          />
          <HeroVisual />
          <HistoricalNote className="mt-4 text-center" />
        </div>
      </FadeIn>
    </section>
  )
}
