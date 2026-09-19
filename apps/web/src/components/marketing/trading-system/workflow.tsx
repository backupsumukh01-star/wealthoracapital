'use client'

import {
  BadgeCheck,
  BrainCircuit,
  CandlestickChart,
  CircleDollarSign,
  Layers3,
  LineChart,
  Radar,
  Scale,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'

import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { GlassCard, SubHeading } from './glass-card'

const STEPS: { title: string; blurb: string; icon: LucideIcon; glow: 'accent' | 'cyan' | 'violet' | 'amber' | 'emerald' }[] =
  [
    { title: 'Investor Funds', blurb: 'Capital credited after verified deposit.', icon: Wallet, glow: 'emerald' },
    { title: 'Capital Allocation', blurb: 'Desk assigns size within programme limits.', icon: Layers3, glow: 'cyan' },
    { title: 'AI Market Scanner', blurb: 'Multi-pair scan for structure and liquidity.', icon: Radar, glow: 'violet' },
    { title: 'Strategy Selection', blurb: 'Match setup type to session conditions.', icon: BrainCircuit, glow: 'accent' },
    { title: 'Risk Validation', blurb: 'Size, stop and exposure checks must pass.', icon: ShieldCheck, glow: 'amber' },
    { title: 'Trade Execution', blurb: 'Orders route under fixed execution rules.', icon: CandlestickChart, glow: 'cyan' },
    { title: 'Position Monitoring', blurb: 'Live watch on P&L, stops and news risk.', icon: LineChart, glow: 'violet' },
    { title: 'Trade Closed', blurb: 'Exit recorded with full ticket metadata.', icon: Scale, glow: 'accent' },
    { title: 'Daily Performance Published', blurb: 'Verified session result goes live.', icon: BadgeCheck, glow: 'emerald' },
    { title: 'Profit Distribution', blurb: 'Eligible wallets receive the published return.', icon: CircleDollarSign, glow: 'amber' },
  ]

export function TradingWorkflow() {
  const railRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ['start 70%', 'end 40%'],
  })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24 })
  const lineScale = useTransform(smooth, [0, 1], [0, 1])

  return (
    <div>
      <SubHeading
        eyebrow="Workflow"
        title="How We Generate Returns"
        subtitle="Every published result comes from a disciplined trading workflow with risk management, execution rules and human oversight."
      />

      <div ref={railRef} className="relative mx-auto max-w-2xl">
        {/* Animated vertical connector */}
        <div className="pointer-events-none absolute left-[1.65rem] top-4 bottom-4 w-px bg-line sm:left-[1.9rem]" aria-hidden>
          {!prefersReducedMotion ? (
            <motion.div
              className="origin-top absolute inset-x-0 top-0 h-full w-px bg-gradient-to-b from-hl-cyan via-accent-300 to-hl-violet"
              style={{ scaleY: lineScale }}
            />
          ) : (
            <div className="h-full w-px bg-gradient-to-b from-hl-cyan via-accent-300 to-hl-violet" />
          )}
        </div>

        <ol className="relative space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <RevealOnScroll key={step.title} delay={Math.min(i * 0.04, 0.28)} y={18}>
                <li className="relative flex gap-4 sm:gap-5">
                  <div
                    className={cn(
                      'relative z-[1] mt-1 grid size-14 shrink-0 place-items-center rounded-2xl border border-glass-line bg-raised/90 shadow-glow-soft sm:size-[3.75rem]',
                    )}
                  >
                    <motion.span
                      animate={prefersReducedMotion ? undefined : { y: [0, -3, 0] }}
                      transition={{ duration: 3.6, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Icon className="size-5 text-accent-200" aria-hidden />
                    </motion.span>
                  </div>
                  <GlassCard glow={step.glow} className="min-w-0 flex-1 py-4 sm:py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                          Step {String(i + 1).padStart(2, '0')}
                        </p>
                        <h4 className="text-heading-sm mt-1 text-fg">{step.title}</h4>
                        <p className="mt-1.5 text-body-sm text-fg-muted">{step.blurb}</p>
                      </div>
                      {!prefersReducedMotion ? (
                        <svg viewBox="0 0 48 32" className="mt-1 hidden h-8 w-12 text-accent-300/50 sm:block" aria-hidden>
                          <motion.path
                            d="M2 22 C10 10, 18 26, 26 14 S40 8, 46 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.1, delay: 0.1 }}
                          />
                        </svg>
                      ) : null}
                    </div>
                  </GlassCard>
                </li>
              </RevealOnScroll>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
