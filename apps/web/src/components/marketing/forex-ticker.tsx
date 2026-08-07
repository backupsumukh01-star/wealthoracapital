'use client'

import { useEffect, useMemo, useState } from 'react'

import { Marquee } from '@/components/motion/marquee'
import { FOREX_TICKER } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

type Tick = {
  pair: string
  price: string
  change: string
  featured?: boolean
  tone?: 'auto' | 'up' | 'down'
}

const DEMO_DISPLAY = {
  scrollSpeed: 38,
  refreshMs: 2800,
  direction: 'left' as const,
  upColor: '#12D6A0',
  downColor: '#F87171',
  neutralColor: '#9CA3AF',
}

function formatPrice(pair: string, value: number) {
  if (pair.startsWith('BTC') || pair.startsWith('ETH') || Number(value) >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  }
  if (Number(value) >= 100) return value.toFixed(2)
  return value.toFixed(4)
}

/** Normalize change to a signed number (never double signs). */
function parseChange(raw: string): number {
  const n = Number.parseFloat(String(raw).replace(/%/g, '').replace(/^\++/, '+').replace(/^-+/, '-'))
  return Number.isFinite(n) ? n : 0
}

/** Display: +0.05% | -0.03% | 0.00% — never ++ or --. */
function formatChangePct(raw: string): { text: string; tone: 'up' | 'down' | 'neutral' } {
  const n = parseChange(raw)
  if (Math.abs(n) < 0.005) {
    return { text: '0.00%', tone: 'neutral' }
  }
  if (n > 0) {
    return { text: `+${Math.abs(n).toFixed(2)}%`, tone: 'up' }
  }
  return { text: `-${Math.abs(n).toFixed(2)}%`, tone: 'down' }
}

function drift(ticks: Tick[]): Tick[] {
  return ticks.map((t) => {
    const price = Number(t.price.replace(/,/g, ''))
    const magnitude = price >= 1000 ? price * 0.0015 : price >= 100 ? 0.28 : 0.0016
    const delta = (Math.random() - 0.5) * magnitude
    const next = Math.max(0.0001, price + delta)
    const change = ((delta / price) * 100).toFixed(2)
    return { ...t, price: formatPrice(t.pair, next), change }
  })
}

function changeColor(tone: 'up' | 'down' | 'neutral', forced?: 'up' | 'down' | 'auto') {
  if (forced === 'up') return DEMO_DISPLAY.upColor
  if (forced === 'down') return DEMO_DISPLAY.downColor
  if (tone === 'up') return DEMO_DISPLAY.upColor
  if (tone === 'down') return DEMO_DISPLAY.downColor
  return DEMO_DISPLAY.neutralColor
}

/** Live market tape — Demo Mode fixtures with live drift (marketing display only). */
export function ForexTicker() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const display = DEMO_DISPLAY

  const source = useMemo(
    () =>
      FOREX_TICKER.map((t, i) => ({
        ...t,
        featured: i < 3,
        tone: 'auto' as const,
      })),
    [],
  )

  const [ticks, setTicks] = useState<Tick[]>(() => [...source])

  useEffect(() => {
    setTicks(source)
  }, [source])

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(
      () => setTicks((prev) => drift(prev)),
      display.refreshMs,
    )
    return () => window.clearInterval(id)
  }, [prefersReducedMotion, display.refreshMs])

  return (
    <div className="w-full min-w-0 overflow-hidden border-b border-white/[0.06] bg-[#07131C]/90 backdrop-blur-xl">
      {/* Full-bleed on mobile; light side padding only for Live badge breathing room */}
      <div className="flex h-9 w-full min-w-0 items-center gap-1.5 px-0 sm:h-10 sm:gap-2 sm:px-1 [mask-image:linear-gradient(90deg,transparent,black_2%,black_98%,transparent)]">
        <span className="ml-2 shrink-0 rounded-full bg-profit/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-profit sm:ml-3 sm:px-2 sm:text-[10px]">
          <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-profit" />
          Live
        </span>
        <Marquee
          speed={Math.max(18, 90 - display.scrollSpeed)}
          direction={display.direction}
          className="min-w-0 flex-1"
          pauseOnHover
          dense
        >
          {ticks.map((tick) => {
            const { text, tone } = formatChangePct(tick.change)
            const color = changeColor(tone, tick.tone === 'auto' ? undefined : tick.tone)
            return (
              <span
                key={tick.pair}
                className={cn(
                  'inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] leading-none sm:h-7 sm:gap-1.5 sm:px-2 sm:text-[11px]',
                  tick.featured
                    ? 'border-accent-500/35 bg-accent-500/15'
                    : 'border-line bg-inset/50',
                )}
              >
                <span className="font-medium whitespace-nowrap text-fg">{tick.pair}</span>
                <span className="whitespace-nowrap tabular-nums text-fg-muted">{tick.price}</span>
                <span className="whitespace-nowrap tabular-nums" style={{ color }}>
                  {text}
                </span>
              </span>
            )
          })}
        </Marquee>
      </div>
    </div>
  )
}
