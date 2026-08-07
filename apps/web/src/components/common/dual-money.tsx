'use client'

import type { MoneyString } from '@meridian/shared'

import { Money } from '@/components/common/money'
import { cn } from '@/lib/cn'

/** INR primary + USD secondary in parentheses (admin / ops standard). */
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
  const inrValue = (inr ?? null) as MoneyString | null
  return (
    <span className={cn('inline-flex flex-col gap-0.5', className)}>
      {inrValue ? (
        <Money value={inrValue} currency="INR" size={size} signed={signed} className="font-medium" />
      ) : (
        <Money value={usd} currency="USD" size={size} signed={signed} className="font-medium" />
      )}
      {inrValue ? (
        <span className="text-[11px] text-fg-subtle tabular-nums">
          (
          <Money value={usd} currency="USD" size="inherit" signed={signed} className="text-fg-subtle" />)
        </span>
      ) : null}
    </span>
  )
}
