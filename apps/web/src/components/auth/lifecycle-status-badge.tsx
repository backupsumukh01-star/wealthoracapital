'use client'

import { kycBadge, statusBadge, type KycLifecycleStatus, type LifecycleStatus } from '@/lib/investor-lifecycle'
import { cn } from '@/lib/cn'

const toneClass: Record<string, string> = {
  profit: 'bg-profit/15 text-profit border-profit/25',
  warning: 'bg-warning/15 text-warning border-warning/25',
  info: 'bg-info/15 text-info border-info/25',
  loss: 'bg-loss/15 text-loss border-loss/25',
  neutral: 'bg-hover text-fg-muted border-line',
}

export function LifecycleStatusBadge({
  status,
  className,
}: {
  status: LifecycleStatus
  className?: string
}) {
  const badge = statusBadge(status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        toneClass[badge.tone],
        className,
      )}
    >
      {badge.label}
    </span>
  )
}

export function KycStatusBadge({
  status,
  className,
}: {
  status: KycLifecycleStatus
  className?: string
}) {
  const badge = kycBadge(status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        toneClass[badge.tone],
        className,
      )}
    >
      {badge.label}
    </span>
  )
}
