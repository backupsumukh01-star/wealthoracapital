'use client'

import { useEffect, useRef } from 'react'

import { FOREX_TICKER } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

/** Glass market cards — horizontal auto-scroll on mobile, 3-up on desktop. */
export function HeroMarketCards() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    if (prefersReducedMotion) return
    const el = scrollerRef.current
    if (!el) return

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!pausedRef.current && window.matchMedia('(max-width: 639px)').matches) {
        const max = el.scrollWidth - el.clientWidth
        if (max > 0) {
          let next = el.scrollLeft + dt * 0.035
          if (next >= max - 0.5) next = 0
          el.scrollLeft = next
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [prefersReducedMotion])

  const cards = FOREX_TICKER.slice(0, 3)

  return (
    <div className="w-full min-w-0">
      <div
        ref={scrollerRef}
        className="no-scrollbar flex gap-3 overflow-x-auto px-0.5 pb-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible"
        onPointerDown={() => {
          pausedRef.current = true
        }}
        onPointerUp={() => {
          pausedRef.current = false
        }}
        onTouchStart={() => {
          pausedRef.current = true
        }}
        onTouchEnd={() => {
          window.setTimeout(() => {
            pausedRef.current = false
          }, 2000)
        }}
      >
        {cards.map((t) => {
          const up = !t.change.startsWith('-')
          return (
            <div
              key={t.pair}
              className="card-fill min-w-[10.5rem] shrink-0 px-4 py-3.5 text-left sm:min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-medium text-fg">{t.pair}</span>
                <span
                  className={cn(
                    'text-[11px] tabular-nums font-medium',
                    up ? 'text-profit' : 'text-loss',
                  )}
                >
                  {up ? '+' : ''}
                  {t.change}%
                </span>
              </div>
              <p className="mt-1 text-body-sm tabular-nums text-fg-muted">{t.price}</p>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-fg-subtle">Indicative market prices</p>
    </div>
  )
}
