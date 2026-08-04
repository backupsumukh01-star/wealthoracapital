'use client'

import { cn } from '@/lib/cn'

import { MiniSparkline } from './mini-sparkline'

const SPARKS = [
  [30, 32, 31, 35, 38, 36, 40, 42, 41, 45, 48, 47, 50, 52],
  [50, 48, 49, 46, 44, 45, 42, 40, 41, 38, 36, 37, 34, 33],
  [28, 30, 33, 32, 36, 39, 38, 42, 45, 44, 48, 50, 49, 53],
  [40, 42, 40, 44, 43, 47, 50, 48, 52, 55, 54, 58, 60, 59],
]

/** Compact pair cards used inside the feature mosaic (replaces plain pills). */
export function ForexPairCardsInline({ pairs }: { pairs: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {pairs.map((pair, i) => {
        const up = i % 2 === 0
        const change = up ? `+${(0.12 + i * 0.07).toFixed(2)}` : `-${(0.08 + i * 0.04).toFixed(2)}`
        return (
          <div
            key={pair}
            className="rounded-xl border border-line bg-inset/45 p-2.5 transition-colors hover:border-accent-800"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption font-medium text-fg">{pair}</span>
              <span
                className={cn(
                  'text-[11px] tabular-nums font-medium',
                  up ? 'text-profit' : 'text-loss',
                )}
              >
                {change}%
              </span>
            </div>
            <MiniSparkline values={SPARKS[i % SPARKS.length]!} positive={up} className="mt-1 h-7" />
          </div>
        )
      })}
    </div>
  )
}
