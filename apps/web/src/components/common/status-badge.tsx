import type { AnyStatus } from '@meridian/shared'

import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

type Tone = NonNullable<BadgeProps['tone']>

/**
 * The single mapping from a domain status to a colour.
 *
 * Every status in the product resolves here and nowhere else. Two screens showing the same
 * status in different colours is the kind of inconsistency that makes a money product feel
 * untrustworthy, so the map is exhaustive and centrally owned (docs/10 §5.2).
 */
const STATUS_TONE: Record<string, Tone> = {
  // Lifecycle — waiting on somebody
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  PROCESSING: 'info',
  QUEUED: 'info',
  RUNNING: 'info',
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  NOT_STARTED: 'neutral',

  // Terminal — good
  APPROVED: 'success',
  COMPLETED: 'success',
  PAID: 'success',
  ACTIVE: 'success',
  VERIFIED: 'success',
  PUBLISHED: 'success',
  CLOSED: 'neutral',

  // Terminal — bad
  REJECTED: 'danger',
  FAILED: 'danger',
  SUSPENDED: 'danger',
  BANNED: 'danger',
  EXPIRED: 'danger',

  // Terminal — neutral
  CANCELLED: 'neutral',
  REVERSED: 'neutral',
  UNVERIFIED: 'neutral',
  SKIPPED: 'neutral',
}

/** `UNDER_REVIEW` → `Under review`. Screaming snake case never reaches a user. */
export function humaniseStatus(status: string): string {
  const lower = status.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export interface StatusBadgeProps {
  status: AnyStatus | string
  /** Adds a filled dot before the label — used in dense tables where the pill is small. */
  withDot?: boolean
  className?: string
}

export function StatusBadge({ status, withDot = true, className }: StatusBadgeProps) {
  const tone = STATUS_TONE[status] ?? 'neutral'

  return (
    <Badge tone={tone} className={cn('gap-1.5', className)}>
      {withDot ? <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {humaniseStatus(status)}
    </Badge>
  )
}
