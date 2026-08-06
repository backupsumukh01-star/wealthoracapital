'use client'

import { useEffect, useRef, useState } from 'react'

import { FOREX_TICKER } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

type Card = { pair: string; price: string; change: string }

function formatPrice(pair: string, value: number) {
  if (pair.startsWith('BTC') || pair.startsWith('ETH') || value >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  }
  if (value >= 100) return value.toFixed(2)
  return value.toFixed(4)
}

function drift(cards: Card[]): Card[] {
  return cards.map((t) => {
    const price = Number(t.price.replace(/,/g, ''))
    if (!Number.isFinite(price) || price <= 0) return t
    const magnitude = price >= 1000 ? price * 0.0015 : price >= 100 ? 0.28 : 0.0016
    const delta = (Math.random() - 0.5) * magnitude
    const next = Math.max(0.0001, price + delta)
    const change = ((delta / price) * 100).toFixed(2)
    return { ...t, price: formatPrice(t.pair, next), change }
  })
}

const DEMO_CARDS: Card[] = FOREX_TICKER.slice(0, 3).map((t) => ({
  pair: t.pair,
  price: t.price,
  change: t.change,
}))

/** Glass market cards — Demo Mode tape with live drift; mobile auto-scroll. */
export function HeroMarketCards() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const [cards, setCards] = useState<Card[]>(DEMO_CARDS)

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => setCards((prev) => drift(prev)), 2800)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

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
                  {up && !t.change.startsWith('+') ? '+' : ''}
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
