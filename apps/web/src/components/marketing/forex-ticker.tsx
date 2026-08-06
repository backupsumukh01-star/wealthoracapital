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
}

function formatPrice(pair: string, value: number) {
  if (pair.startsWith('BTC') || pair.startsWith('ETH') || Number(value) >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  }
  if (Number(value) >= 100) return value.toFixed(2)
  return value.toFixed(4)
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
      <div className="flex h-10 min-w-0 items-center gap-2 px-3 sm:h-11 sm:gap-3 sm:px-4 [mask-image:linear-gradient(90deg,transparent,black_2%,black_98%,transparent)]">
        <span className="shrink-0 rounded-full bg-profit/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-profit">
          <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-profit" />
          Live
        </span>
        <Marquee
          speed={Math.max(18, 90 - display.scrollSpeed)}
          direction={display.direction}
          className="min-w-0 flex-1"
          pauseOnHover
        >
          {ticks.map((tick) => {
            const forced =
              tick.tone === 'up' ? true : tick.tone === 'down' ? false : !tick.change.startsWith('-')
            return (
              <span
                key={tick.pair}
                className={cn(
                  'inline-flex h-7 shrink-0 items-center gap-2 rounded-full border px-2.5 text-[11px] sm:px-3 sm:text-caption',
                  tick.featured
                    ? 'border-accent-500/35 bg-accent-500/15'
                    : 'border-line bg-inset/50',
                )}
              >
                <span className="font-medium whitespace-nowrap text-fg">{tick.pair}</span>
                <span className="min-w-[4.25rem] text-right tabular-nums text-fg-muted">
                  {tick.price}
                </span>
                <span
                  className="min-w-[3.25rem] text-right tabular-nums"
                  style={{ color: forced ? display.upColor : display.downColor }}
                >
                  {forced && !tick.change.startsWith('+') && !tick.change.startsWith('-')
                    ? '+'
                    : ''}
                  {tick.change.startsWith('-') || tick.change.startsWith('+')
                    ? tick.change
                    : `${forced ? '+' : '-'}${tick.change.replace(/^-/, '')}`}
                  %
                </span>
              </span>
            )
          })}
        </Marquee>
      </div>
    </div>
  )
}
