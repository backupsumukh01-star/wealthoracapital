import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

export interface StatCardProps {
  label: string
  /** Pre-formatted by the caller — usually a `<Money>` or `<Percent>` element. */
  value: ReactNode
  /** A period-over-period delta, rendered small beneath the figure. */
  delta?: ReactNode
  hint?: string
  icon?: LucideIcon
  /** Swaps the whole body for a skeleton of the same height, so nothing shifts on load. */
  loading?: boolean
  className?: string
}

/**
 * The KPI tile used across the dashboard and admin overview.
 *
 * The label sits above the figure rather than below it: on a metrics grid the eye scans
 * left-to-right for the thing it wants, then down to the number (docs/09 §Dashboard).
 */
export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  loading = false,
  className,
}: StatCardProps) {
  return (
    <Card variant="glass" className={cn('min-w-0 p-4 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-caption text-fg-subtle">{label}</span>
          {hint ? (
            <InfoTooltip label={hint}>
              <button
                type="button"
                aria-label={`About ${label}`}
                className="size-4 cursor-help rounded-full border border-line-default text-center text-[10px] leading-[14px] text-fg-subtle hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
              >
                ?
              </button>
            </InfoTooltip>
          ) : null}
        </div>
        {Icon ? <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden /> : null}
      </div>

      <div className="mt-3 space-y-1">
        {loading ? (
          <>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </>
        ) : (
          <>
            <div className="text-stat-lg text-fg">{value}</div>
            {delta ? <div className="text-body-sm text-fg-muted">{delta}</div> : null}
          </>
        )}
      </div>
    </Card>
  )
}
