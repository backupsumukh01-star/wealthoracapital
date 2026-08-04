'use client'

import {
  Bell,
  LineChart,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { Section } from '@/components/common/section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

/**
 * A stylised preview of the investor dashboard — builds desire without requiring login.
 */
export function PortfolioPreview() {
  return (
    <Section
      id="portfolio"
      eyebrow="Portfolio preview"
      title="What you see after you sign in"
      description="Wallet balance, today’s profit, equity chart and notifications — the same numbers that drive distributions."
    >
      <RevealOnScroll>
        <div className="glass glass-edge relative overflow-hidden rounded-2xl p-4 shadow-e4 sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-caption text-fg-subtle">Good afternoon, Ayesha</p>
              <p className="text-heading-sm text-fg">Your investment dashboard</p>
            </div>
            <Badge tone="accent" size="sm">
              Today&apos;s return published
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card variant="inset" padded="md" className="sm:col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-caption text-fg-subtle">Wallet balance</p>
                    <p className="text-stat-lg mt-2 tabular-nums text-fg">$12,480.75</p>
                    <p className="mt-1 text-caption text-profit">+$87.36 today · +0.70%</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-900/50 text-accent-300">
                    <Wallet className="size-5" aria-hidden />
                  </span>
                </div>
              </Card>

              <Card variant="inset" padded="md">
                <div className="flex items-center justify-between">
                  <p className="text-caption text-fg-subtle">Total profit</p>
                  <TrendingUp className="size-4 text-profit" aria-hidden />
                </div>
                <p className="text-stat-md mt-3 tabular-nums text-profit">+$2,480.75</p>
                <p className="mt-1 text-caption text-fg-subtle">ROI 24.8%</p>
              </Card>

              <Card variant="inset" padded="md">
                <div className="flex items-center justify-between">
                  <p className="text-caption text-fg-subtle">Invested</p>
                  <LineChart className="size-4 text-accent-300" aria-hidden />
                </div>
                <p className="text-stat-md mt-3 tabular-nums text-fg">$10,000.00</p>
                <p className="mt-1 text-caption text-fg-subtle">Principal in programme</p>
              </Card>
            </div>

            <div className="grid gap-4">
              <Card variant="inset" padded="md" className="min-h-[200px]">
                <p className="text-caption text-fg-subtle">Equity · 30 days</p>
                <svg viewBox="0 0 320 120" className="mt-4 h-28 w-full" aria-hidden>
                  <defs>
                    <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 90 L40 82 L80 86 L120 70 L160 74 L200 52 L240 58 L280 34 L320 28 V120 H0 Z"
                    fill="url(#dashArea)"
                  />
                  <path
                    d="M0 90 L40 82 L80 86 L120 70 L160 74 L200 52 L240 58 L280 34 L320 28"
                    fill="none"
                    stroke="var(--accent-300)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Card>

              <Card variant="inset" padded="md">
                <div className="mb-3 flex items-center gap-2">
                  <Bell className="size-4 text-accent-300" aria-hidden />
                  <p className="text-body-sm font-medium text-fg">Notifications</p>
                </div>
                <ul className="space-y-2.5">
                  {[
                    { title: 'Daily return applied', meta: '+$87.36 · just now' },
                    { title: 'Deposit approved', meta: '$1,000.00 · yesterday' },
                    { title: 'EUR/USD BUY published', meta: '+0.70% · yesterday' },
                  ].map((n) => (
                    <li
                      key={n.title}
                      className="rounded-lg border border-line/80 bg-raised/40 px-3 py-2.5"
                    >
                      <p className="text-body-sm text-fg">{n.title}</p>
                      <p className="text-caption text-fg-subtle">{n.meta}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </Section>
  )
}
