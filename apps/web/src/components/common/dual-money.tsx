'use client'

import type { MoneyString } from '@meridian/shared'

import { Money } from '@/components/common/money'
import { cn } from '@/lib/cn'

/**
 * Platform denomination is USD.
 * `inr` is accepted for call-site compatibility (API still returns INR snapshots)
 * and is not rendered.
 */
export function DualMoney({
  usd,
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
    <span className={cn('inline-flex flex-col gap-0.5', className)}>
      <Money value={usd} currency="USD" size={size} signed={signed} className="font-medium" />
    </span>
  )
}
