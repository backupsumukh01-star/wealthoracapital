'use client'

import { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Globe2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

import { CountUp } from '@/components/motion/count-up'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { TRUST_METRICS } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

const ACCENT: Record<string, string> = {
  emerald: 'text-hl-emerald border-hl-emerald/30 bg-hl-emerald/10',
  cyan: 'text-hl-cyan border-hl-cyan/30 bg-hl-cyan/10',
  blue: 'text-hl-blue border-hl-blue/30 bg-hl-blue/10',
  amber: 'text-hl-amber border-hl-amber/30 bg-hl-amber/10',
}

const ICONS: LucideIcon[] = [ShieldCheck, Globe2, ArrowUpFromLine, ArrowDownToLine]

/** Animated trust metrics + live social-proof pulse. */
export function TrustStrip() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [payouts, setPayouts] = useState(146)

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => {
      setPayouts((n) => n + (Math.random() > 0.55 ? 1 : 0))
    }, 5200)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

  return (
    <section className="border-y border-glass-line py-6 sm:py-8" aria-label="Trust signals">
      <div className="container-page min-w-0">
        <div className="section-divider mb-6" />
        <StaggerGroup className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {TRUST_METRICS.map((metric, index) => {
            const Icon = ICONS[index] ?? ShieldCheck
            return (
              <StaggerItem key={metric.label}>
                <div
                  className={cn(
                    'card-fill flex h-full min-w-0 flex-col gap-2.5 p-3.5 transition-transform duration-[160ms] hover:-translate-y-1 sm:gap-3 sm:p-5',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 text-[11px] leading-snug text-fg-subtle sm:text-caption">
                      {metric.label}
                    </p>
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg border',
                        ACCENT[metric.accent],
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                  </div>
                  <p className="text-stat-md break-words text-fg sm:text-stat-lg">
                    {metric.label === 'Daily payouts today' ? (
                      <span className="tabular-nums">{payouts}</span>
                    ) : (
                      <CountUp
                        value={metric.value}
                        prefix={'prefix' in metric ? metric.prefix : ''}
                        suffix={metric.suffix}
                        decimals={'decimals' in metric ? metric.decimals : 0}
                      />
                    )}
                  </p>
                  <div className="mt-auto h-1 overflow-hidden rounded-full bg-hover">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        metric.accent === 'emerald' && 'bg-hl-emerald',
                        metric.accent === 'cyan' && 'bg-hl-cyan',
                        metric.accent === 'blue' && 'bg-hl-blue',
                        metric.accent === 'amber' && 'bg-hl-amber',
                      )}
                      style={{ width: `${55 + index * 10}%` }}
                    />
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </div>
    </section>
  )
}
