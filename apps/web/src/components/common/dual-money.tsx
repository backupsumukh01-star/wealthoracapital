'use client'

import type { MoneyString } from '@meridian/shared'

import { Money } from '@/components/common/money'
import { cn } from '@/lib/cn'

/** USD primary + optional INR secondary (snapshot or live equivalent). */
export function DualMoney({
  usd,
  inr,
  className,
  size = 'inherit',
  signed = false,
}: {
  usd: MoneyString
  inr?: MoneyString | null
  className?: string
  size?: 'inherit' | 'sm' | 'md' | 'lg' | 'xl'
  signed?: boolean
}) {
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5', className)}>
      <Money value={usd} currency="USD" size={size} signed={signed} className="font-medium" />
      {inr ? (
        <span className="text-fg-subtle text-caption tabular-nums">
          · <Money value={inr} currency="INR" size="inherit" />
        </span>
      ) : null}
    </span>
  )
}
