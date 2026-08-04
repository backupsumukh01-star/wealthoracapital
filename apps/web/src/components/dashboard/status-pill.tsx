'use client'

import { cn } from '@/lib/cn'

const TONE: Record<string, string> = {
  PENDING: 'bg-warning/15 text-warning border-warning/30',
  UNDER_REVIEW: 'bg-info/15 text-info border-info/30',
  APPROVED: 'bg-profit/15 text-profit border-profit/30',
  PAID: 'bg-profit/15 text-profit border-profit/30',
  REJECTED: 'bg-loss/15 text-loss border-loss/30',
  CANCELLED: 'bg-hover text-fg-muted border-line',
  CREDITED: 'bg-profit/15 text-profit border-profit/30',
}

export function StatusPill({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const label = status.replaceAll('_', ' ')
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize',
        TONE[status] ?? TONE.PENDING,
        className,
      )}
    >
      {label.toLowerCase()}
    </span>
  )
}
