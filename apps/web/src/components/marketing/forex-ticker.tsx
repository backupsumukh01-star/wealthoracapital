'use client'

import { useMemo } from 'react'

import { Marquee } from '@/components/motion/marquee'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

/** Live market tape — CMS-published ticker only. Renders nothing when unpublished or empty. */
export function ForexTicker() {
  const { ready, state } = useAdminOs()
  const display = state.tickerDisplay

  const ticks = useMemo(() => {
    if (!ready || !display.enabled) return []
    return [...state.ticker]
      .filter((t) => t.enabled)
      .sort((a, b) => a.order - b.order)
      .map((t) => ({
        pair: t.pair,
        price: t.price,
        change: t.change,
        featured: t.featured,
        tone: t.tone ?? 'auto',
      }))
  }, [ready, state.ticker, display.enabled])

  if (!ready || !display.enabled || ticks.length === 0) return null

  return (
    <div className="w-full min-w-0 overflow-hidden border-b border-white/[0.06] bg-[#07131C]/90 backdrop-blur-xl">
      <div className="flex h-10 min-w-0 items-center gap-2 px-3 sm:h-11 sm:gap-3 sm:px-4 [mask-image:linear-gradient(90deg,transparent,black_2%,black_98%,transparent)]">
        <span className="shrink-0 rounded-full bg-profit/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-profit">
          <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-profit" />
          Live
        </span>
        <Marquee
          speed={Math.max(18, 90 - (display.scrollSpeed || 38))}
          direction={display.direction === 'right' ? 'right' : 'left'}
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
