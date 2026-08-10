'use client'

import { Marquee } from '@/components/motion/marquee'
import {
  formatMarketChangePct,
  marketStatusBadge,
  useMarketQuotes,
} from '@/features/markets/hooks'
import { cn } from '@/lib/cn'

/** Market tape — quotes exclusively from GET /markets/quotes (never demo drift). */
export function ForexTicker() {
  const { data, isError, isLoading } = useMarketQuotes()
  const status = data?.status ?? (isError || (!isLoading && !data?.quotes?.length) ? 'OFFLINE' : undefined)
  const badge = marketStatusBadge(status)
  const quotes = data?.quotes ?? []
  const updatedLabel =
    data?.updatedAt && status !== 'OFFLINE'
      ? new Date(data.updatedAt).toISOString().slice(11, 19) + ' UTC'
      : null

  return (
    <div className="w-full min-w-0 overflow-hidden border-b border-white/[0.06] bg-[#07131C]/90 backdrop-blur-xl">
      <div className="flex h-9 w-full min-w-0 items-center gap-1.5 px-0 sm:h-10 sm:gap-2 sm:px-1 [mask-image:linear-gradient(90deg,transparent,black_2%,black_98%,transparent)]">
        <span
          className={cn(
            'ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:ml-3 sm:px-2',
            badge.live
              ? 'bg-profit/15 text-profit'
              : status === 'DELAYED'
                ? 'bg-warning/15 text-warning'
                : 'bg-fg-subtle/15 text-fg-subtle',
          )}
        >
          {badge.live ? (
            <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-profit" />
          ) : null}
          {badge.label}
        </span>
        {updatedLabel ? (
          <span className="hidden shrink-0 text-[10px] tabular-nums text-fg-subtle sm:inline">
            Updated {updatedLabel}
          </span>
        ) : null}

        {quotes.length === 0 ? (
          <p className="min-w-0 flex-1 truncate px-3 text-[11px] text-fg-subtle">
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
                      'whitespace-nowrap tabular-nums',
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
