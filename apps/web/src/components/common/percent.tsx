import type { PercentString } from '@meridian/shared'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { cn } from '@/lib/cn'
import { formatPercent, signOf } from '@/lib/format'

export interface PercentProps {
  /** A decimal string, e.g. `"0.700000"`. Never a `number`. */
  value: PercentString
  decimals?: number
  signed?: boolean
  /** Adds a direction arrow so the sign is carried twice over. */
  showArrow?: boolean
  colour?: boolean
  size?: 'inherit' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  inherit: '',
  sm: 'text-body-sm',
  md: 'text-stat-md',
  lg: 'text-stat-lg',
} as const

export function Percent({
  value,
  decimals = 2,
  signed = true,
  showArrow = false,
  colour = true,
  size = 'inherit',
  className,
}: PercentProps) {
  const sign = signOf(value)
  const Arrow = sign > 0 ? ArrowUpRight : sign < 0 ? ArrowDownRight : Minus

  return (
    <span
      data-numeric
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        sizeClasses[size],
        colour && sign > 0 && 'text-profit',
        colour && sign < 0 && 'text-loss',
        colour && sign === 0 && 'text-fg-muted',
        className,
      )}
    >
      {showArrow ? <Arrow className="size-[0.9em] shrink-0" aria-hidden /> : null}
      {formatPercent(value, { decimals, signed })}
    </span>
  )
}
