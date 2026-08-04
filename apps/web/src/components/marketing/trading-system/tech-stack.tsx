'use client'

import { motion } from 'framer-motion'
import {
  BellRing,
  Brain,
  ChartCandlestick,
  FileSearch,
  Gauge,
  Layers2,
  Shield,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { SubHeading } from './glass-card'

const STACK: { title: string; blurb: string; icon: LucideIcon; x: string; y: string; delay: number }[] = [
  { title: 'AI Signal Analysis', blurb: 'Pattern & context scoring', icon: Brain, x: '8%', y: '12%', delay: 0 },
  { title: 'Multi-Timeframe Analysis', blurb: 'M1 → H4 alignment', icon: Layers2, x: '55%', y: '8%', delay: 0.2 },
  { title: 'Market Trend Detection', blurb: 'Directional regime map', icon: ChartCandlestick, x: '72%', y: '38%', delay: 0.4 },
  { title: 'Risk Engine', blurb: 'Hard exposure gates', icon: Shield, x: '18%', y: '48%', delay: 0.1 },
  { title: 'Execution Engine', blurb: 'Rule-bound order routing', icon: Workflow, x: '42%', y: '58%', delay: 0.3 },
  { title: 'Performance Analytics', blurb: 'Equity & drawdown views', icon: Gauge, x: '68%', y: '72%', delay: 0.5 },
  { title: 'Audit Logs', blurb: 'Immutable ticket trail', icon: FileSearch, x: '10%', y: '78%', delay: 0.25 },
  { title: 'Notifications', blurb: 'Desk & investor alerts', icon: BellRing, x: '38%', y: '28%', delay: 0.15 },
]

export function TechnologyStack() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <SubHeading
        eyebrow="Technology"
        title="Technology Stack"
        subtitle="Floating modules that power scan → risk → execute → publish."
      />

      {/* Desktop floating field */}
      <div className="relative hidden min-h-[28rem] overflow-hidden rounded-3xl border border-glass-line bg-inset/40 lg:block">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(50% 45% at 50% 45%, rgb(18 214 160 / 0.2) 0%, transparent 70%)',
          }}
          aria-hidden
        />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <motion.circle
            cx="50%"
            cy="48%"
            r="120"
            fill="none"
            stroke="var(--accent-500)"
            strokeOpacity="0.15"
            strokeDasharray="4 8"
            animate={prefersReducedMotion ? undefined : { rotate: 360 }}
            style={{ transformOrigin: '50% 48%' }}
            transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
          />
        </svg>

        {STACK.map((item) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.title}
              className="absolute w-[13.5rem]"
              style={{ left: item.x, top: item.y }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : { y: [0, -8, 0], x: [0, 4, 0] }
              }
              transition={{
                duration: 5.5 + item.delay,
                delay: item.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.04, zIndex: 10 }}
            >
              <div className="rounded-2xl border border-glass-line bg-glass/70 p-4 shadow-e3 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-lg border border-line bg-raised text-accent-200">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <p className="text-caption font-medium text-fg">{item.title}</p>
                </div>
                <p className="text-[12px] text-fg-muted">{item.blurb}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Mobile grid */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {STACK.map((item, i) => {
          const Icon = item.icon
          return (
            <li
              key={item.title}
              className={cn(
                'rounded-2xl border border-glass-line bg-glass/55 p-4 backdrop-blur-xl',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-line bg-raised text-accent-200">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-caption font-medium text-fg">{item.title}</p>
                  <p className="text-[12px] text-fg-muted">{item.blurb}</p>
                </div>
              </div>
              {!prefersReducedMotion ? (
                <motion.div
                  className="mt-3 h-px origin-left bg-gradient-to-r from-accent-400 to-transparent"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
