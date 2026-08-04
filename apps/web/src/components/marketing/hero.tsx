'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight, BadgeCheck, Lock, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

import { LogoMark } from '@/components/common/logo'
import { FadeIn } from '@/components/motion/fade-in'
import { Magnetic } from '@/components/motion/magnetic'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useAuthModal } from '@/providers/auth-modal-provider'
import { useAdminOs } from '@/providers/admin-os-provider'

import { HeroMarketCards } from './hero-market-cards'
import { HeroVisual } from './hero-visual'
import { HistoricalNote } from './historical-note'

const TRUST = [
  { label: 'Published trade history', icon: BadgeCheck },
  { label: 'Operator-verified days', icon: Shield },
  { label: 'Withdraw anytime', icon: Lock },
] as const

/** Premium centered hero — Growzy brand, CTAs, trust, markets, equity visual. */
export function Hero() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { openAuth } = useAuthModal()
  const { publishedLanding: cms } = useAdminOs()
  const heroMotion = cms.heroMotion
  const intensity = heroMotion?.intensity ?? 1
  const showGlow = !prefersReducedMotion && (heroMotion?.glowEnabled ?? true)
  const showParticles = !prefersReducedMotion && (heroMotion?.particlesEnabled ?? true)

  return (
    <section className="relative isolate overflow-x-clip overflow-y-hidden pb-14 pt-10 sm:pb-20 sm:pt-14 lg:pb-28 lg:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-base" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-20" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh]"
        style={{
          background: `radial-gradient(80% 55% at 50% 0%, rgb(18 214 160 / ${0.28 * intensity}) 0%, transparent 70%)`,
        }}
      />
      {showGlow ? (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent-500/15 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.35 * intensity, 0.55 * intensity, 0.35 * intensity] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      {showParticles
        ? Array.from({ length: Math.round(10 * intensity) }).map((_, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute -z-10 size-1 rounded-full bg-accent-300/35"
              style={{
                left: `${10 + ((i * 19) % 80)}%`,
                top: `${18 + ((i * 27) % 55)}%`,
              }}
              animate={{ y: [0, -14, 0], opacity: [0.15, 0.5, 0.15] }}
              transition={{ duration: 5 + (i % 3), delay: i * 0.3, repeat: Infinity }}
            />
          ))
        : null}

      <div className="container-page flex min-w-0 flex-col items-center text-center">
        <FadeIn>
          <div className="mb-7 flex flex-col items-center gap-3.5 sm:mb-8 sm:gap-4">
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-6 rounded-full bg-[#12D6A0]/25 blur-2xl"
                aria-hidden
              />
              <LogoMark className="relative size-16 sm:size-[4.5rem]" />
            </div>
            <p className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
              <span className="bg-gradient-to-r from-[#5EF2C4] via-[#12D6A0] to-[#2AE8FF] bg-clip-text text-transparent">
                {cms.companyName || SITE.wordmark.primary}
              </span>
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.06}>
          <h1 className="text-display-xl max-w-4xl break-words text-fg">
            {cms.heroTitle.includes('every trade') ? (
              <>
                Forex investing with
                <span className="text-gradient block">every trade on record</span>
              </>
            ) : (
              cms.heroTitle
            )}
          </h1>
        </FadeIn>

        <FadeIn delay={0.12}>
          <p className="prose-measure mx-auto mt-5 max-w-[40ch] text-body-md text-fg-muted sm:mt-6 sm:max-w-none sm:text-body-lg">
            {cms.heroSubtitle}
          </p>
        </FadeIn>

        <FadeIn delay={0.16}>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center">
            <Magnetic>
              <Button size="lg" className="w-full sm:w-auto" onClick={() => openAuth('register')}>
                {cms.heroPrimaryCta}
                <ArrowRight aria-hidden />
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="glass" className="w-full sm:w-auto">
              <Link href={ROUTES.marketing.performance}>{cms.heroSecondaryCta}</Link>
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
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

        <FadeIn delay={0.24} className="mt-8 w-full max-w-3xl sm:mt-10">
          <HeroMarketCards />
        </FadeIn>
      </div>

      <FadeIn delay={0.28} y={28} className="container-page mt-12 sm:mt-14 lg:mt-16">
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
