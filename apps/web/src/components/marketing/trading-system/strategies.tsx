'use client'

import { motion } from 'framer-motion'
import {
  Activity,
  Crosshair,
  Filter,
  Gauge,
  Layers,
  Mountain,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { GlassCard, SubHeading } from './glass-card'

const STRATEGIES: {
  title: string
  description: string
  confidence: number
  risk: 'Low' | 'Medium' | 'Elevated'
  icon: LucideIcon
}[] = [
  { title: 'Trend Following', description: 'Ride established directional moves.', confidence: 82, risk: 'Medium', icon: Activity },
  { title: 'Momentum Trading', description: 'Enter when impulse and volume align.', confidence: 76, risk: 'Elevated', icon: Zap },
  { title: 'Breakout Detection', description: 'Flag compressed ranges near release.', confidence: 71, risk: 'Elevated', icon: Crosshair },
  { title: 'Liquidity Zones', description: 'Map pools where orders tend to cluster.', confidence: 84, risk: 'Low', icon: Waves },
  { title: 'Support & Resistance', description: 'Structure levels for entries and exits.', confidence: 88, risk: 'Low', icon: Mountain },
  { title: 'Session Trading', description: 'Bias setups to London / NY / Asia hours.', confidence: 79, risk: 'Medium', icon: Gauge },
  { title: 'News Filter', description: 'Suppress entries around high-impact events.', confidence: 91, risk: 'Low', icon: Filter },
  { title: 'Volatility Analysis', description: 'Size and filter by realised ranges.', confidence: 85, risk: 'Medium', icon: Layers },
]

function RiskPill({ risk }: { risk: 'Low' | 'Medium' | 'Elevated' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-medium',
        risk === 'Low' && 'bg-hl-emerald/15 text-hl-emerald',
        risk === 'Medium' && 'bg-hl-amber/15 text-hl-amber',
        risk === 'Elevated' && 'bg-loss/15 text-loss',
      )}
    >
      {risk} risk
    </span>
  )
}

export function StrategyEngine() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <SubHeading
        eyebrow="Strategy engine"
        title="Strategies the desk can select"
        subtitle="Each module scores context before capital is committed."
      />

      <StaggerGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STRATEGIES.map((s, i) => {
          const Icon = s.icon
          return (
            <StaggerItem key={s.title}>
              <GlassCard className="h-full" glow={i % 2 === 0 ? 'cyan' : 'violet'}>
                <motion.span
                  className="mb-4 grid size-11 place-items-center rounded-xl border border-glass-line bg-inset/60 text-accent-200"
                  animate={prefersReducedMotion ? undefined : { rotate: [0, 4, 0, -4, 0] }}
                  transition={{ duration: 5, delay: i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Icon className="size-5" aria-hidden />
                </motion.span>
                <h4 className="text-heading-sm text-fg">{s.title}</h4>
                <p className="mt-1.5 text-body-sm text-fg-muted">{s.description}</p>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption text-fg-subtle">Confidence</span>
                    <span className="text-caption tabular-nums text-fg">{s.confidence}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-hl-cyan"
                      initial={prefersReducedMotion ? false : { width: 0 }}
                      whileInView={{ width: `${s.confidence}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="pt-1">
                    <RiskPill risk={s.risk} />
                  </div>
                </div>
              </GlassCard>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </div>
  )
}
