'use client'

import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import {
  CheckCircle2,
  ClipboardCheck,
  Radar,
  ShieldCheck,
  Signal,
  SquareActivity,
  Trophy,
} from 'lucide-react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { GlassCard, SubHeading } from './glass-card'

const STAGES = [
  { title: 'Market Scan', icon: Radar },
  { title: 'Signal Generated', icon: Signal },
  { title: 'Risk Checked', icon: ShieldCheck },
  { title: 'Trade Executed', icon: SquareActivity },
  { title: 'Position Managed', icon: ClipboardCheck },
  { title: 'Trade Closed', icon: CheckCircle2 },
  { title: 'Performance Recorded', icon: Trophy },
] as const

export function TradeLifecycle() {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 75%', 'end 55%'],
  })
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 22 })
  const width = useTransform(smooth, [0, 1], ['0%', '100%'])

  return (
    <div>
      <SubHeading
        eyebrow="Trade lifecycle"
        title="From scan to ledger entry"
        subtitle="One ticket. Seven gates. Full audit trail."
      />

      <div ref={ref} className="relative">
        {/* Desktop horizontal rail */}
        <div className="relative hidden lg:block">
          <div className="absolute left-0 right-0 top-[2.15rem] h-px bg-line" aria-hidden>
            {!prefersReducedMotion ? (
              <motion.div
                className="h-full bg-gradient-to-r from-hl-cyan via-accent-300 to-hl-violet"
                style={{ width }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-hl-cyan via-accent-300 to-hl-violet" />
            )}
          </div>

          <ol className="relative grid grid-cols-7 gap-3">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon
              return (
                <motion.li
                  key={stage.title}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: i * 0.07, duration: 0.45 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative z-[1] grid size-[4.3rem] place-items-center rounded-2xl border border-glass-line bg-glass/70 shadow-glow-soft backdrop-blur-xl">
                    <motion.span
                      animate={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1] }}
                      transition={{ duration: 2.8, delay: i * 0.2, repeat: Infinity }}
                    >
                      <Icon className="size-5 text-accent-200" aria-hidden />
                    </motion.span>
                  </div>
                  <p className="mt-3 text-caption font-medium text-fg">{stage.title}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                </motion.li>
              )
            })}
          </ol>
        </div>

        {/* Mobile / tablet stack */}
        <ol className="space-y-3 lg:hidden">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon
            return (
              <li key={stage.title}>
                <GlassCard className="py-4" glow={i % 2 === 0 ? 'cyan' : 'accent'}>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-11 place-items-center rounded-xl border border-glass-line bg-inset/50 text-accent-200',
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">
                        Stage {String(i + 1).padStart(2, '0')}
                      </p>
                      <p className="text-heading-sm text-fg">{stage.title}</p>
                    </div>
                  </div>
                </GlassCard>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
