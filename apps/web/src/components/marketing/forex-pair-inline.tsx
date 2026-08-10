'use client'

import { formatMarketChangePct, useMarketQuotes } from '@/features/markets/hooks'
import { cn } from '@/lib/cn'

/** Compact pair cards — prices from centralized market feed when available. */
export function ForexPairCardsInline({ pairs }: { pairs: string[] }) {
  const { data } = useMarketQuotes()
  const bySymbol = new Map((data?.quotes ?? []).map((q) => [q.symbol, q]))

  return (
    <div className="grid grid-cols-2 gap-2">
      {pairs.map((pair) => {
        const quote = bySymbol.get(pair)
        const { text, tone } = formatMarketChangePct(quote?.changePercent ?? '0')
        return (
          <div
            key={pair}
            className="rounded-xl border border-line bg-inset/45 p-2.5 transition-colors hover:border-accent-800"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption font-medium text-fg">{pair}</span>
              {quote ? (
                <span
                  className={cn(
                    'text-[11px] tabular-nums font-medium',
                    tone === 'up' && 'text-profit',
                    tone === 'down' && 'text-loss',
                    tone === 'neutral' && 'text-fg-subtle',
                  )}
                >
                  {text}
                </span>
              ) : (
                <span className="text-[11px] text-fg-subtle">—</span>
              )}
            </div>
            <p className="mt-1 text-caption tabular-nums text-fg-muted">
              {quote?.price ?? '—'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
