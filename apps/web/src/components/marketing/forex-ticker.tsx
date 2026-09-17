'use client'

import { Marquee } from '@/components/motion/marquee'
import { formatMarketChangePct, useMarketQuotes } from '@/features/markets/hooks'
import { cn } from '@/lib/cn'

/** Market tape — last price + ±% from GET /markets/quotes (never demo drift). */
export function ForexTicker() {
  const { data, isError, isLoading } = useMarketQuotes()
  const offline =
    isError || (!isLoading && (!data?.quotes?.length || data.status === 'OFFLINE'))
  const quotes = data?.quotes ?? []

  return (
    <div className="w-full min-w-0 overflow-hidden border-b border-white/[0.06] bg-[#07090B]/90 backdrop-blur-xl">
      <div className="flex h-9 w-full min-w-0 items-center gap-1.5 px-0 sm:h-10 sm:gap-2 sm:px-1 [mask-image:linear-gradient(90deg,transparent,black_2%,black_98%,transparent)]">
        {quotes.length === 0 || offline ? (
          <p className="min-w-0 flex-1 truncate px-3 text-[11px] text-fg-subtle sm:px-4">
            {data?.message || (isLoading ? 'Loading market data…' : 'Market data unavailable')}
          </p>
        ) : (
          <Marquee speed={52} direction="left" className="min-w-0 flex-1" pauseOnHover dense>
            {quotes.map((tick, i) => {
              const { text, tone } = formatMarketChangePct(tick.changePercent)
              return (
                <span
                  key={tick.symbol}
                  className={cn(
                    'inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] leading-none sm:h-7 sm:gap-1.5 sm:px-2 sm:text-[11px]',
                    i < 3
                      ? 'border-accent-500/35 bg-accent-500/15'
                      : 'border-line bg-inset/50',
                  )}
                >
                  <span className="font-medium whitespace-nowrap text-fg">{tick.symbol}</span>
                  <span className="whitespace-nowrap tabular-nums text-fg-muted">{tick.price}</span>
                  <span
                    className={cn(
                      'whitespace-nowrap tabular-nums font-medium',
                      tone === 'up' && 'text-profit',
                      tone === 'down' && 'text-loss',
                      tone === 'neutral' && 'text-fg-subtle',
                    )}
                  >
                    {text}
                  </span>
                </span>
              )
            })}
          </Marquee>
        )}
      </div>
    </div>
  )
}
