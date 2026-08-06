import type { MoneyString } from '@meridian/shared'

import { cn } from '@/lib/cn'
import { formatMoney, signOf } from '@/lib/format'

export interface MoneyProps {
  /**
   * A decimal **string**, e.g. `"1250.75"`.
   *
   * The type is deliberately not `number`. Accepting a number here would invite
   * `<Money value={balance * rate} />`, which is the single most dangerous bug class in the
   * product — so it is a compile error instead of a code-review catch (docs/10 §6).
   */
  value: MoneyString
  currency?: string
  /** Colours gains green and losses red, and forces an explicit `+` or `−`. */
  signed?: boolean
  /** `$1.2M` instead of `$1,200,000.00`. For dense marketing figures only. */
  compact?: boolean
  /** Drops the currency symbol. */
  bare?: boolean
  size?: 'inherit' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  inherit: '',
  sm: 'text-body-sm',
  md: 'text-stat-md',
  lg: 'text-stat-lg',
  xl: 'text-stat-xl',
} as const

/**
 * Colour is reinforcement, never the sole carrier of meaning: a signed value always carries an
 * explicit `+` or `−` alongside the colour, so it survives a colour-blind reader and a
 * greyscale print (docs/10 §2.5).
 */
export function Money({
  value,
  currency = 'USD',
  signed = false,
  compact = false,
  bare = false,
  size = 'inherit',
  className,
}: MoneyProps) {
  const sign = signed ? signOf(value) : 0
  const decimals = currency === 'INR' ? 0 : 2

  return (
    <span
      data-numeric
      className={cn(
        'tabular-nums',
        sizeClasses[size],
        sign > 0 && 'text-profit',
        sign < 0 && 'text-loss',
        className,
      )}
    >
      {formatMoney(value, { currency, signed, compact, bare, decimals })}
    </span>
  )
}
