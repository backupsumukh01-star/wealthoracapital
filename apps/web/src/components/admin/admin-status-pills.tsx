'use client'

import { cn } from '@/lib/cn'
import type {
  AdminAccountStatus,
  AdminDepositStatus,
  AdminKycStatus,
  AdminWithdrawalStatus,
} from '@/components/admin/admin-ui-types'

const tone = {
  profit: 'border-profit/25 bg-profit/15 text-profit',
  warning: 'border-warning/25 bg-warning/15 text-warning',
  info: 'border-info/25 bg-info/15 text-info',
  loss: 'border-loss/25 bg-loss/15 text-loss',
  neutral: 'border-line bg-hover text-fg-muted',
} as const

function Pill({
  label,
  variant,
  className,
}: {
  label: string
  variant: keyof typeof tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tone[variant],
        className,
      )}
    >
      {label}
    </span>
  )
}

export function AdminKycPill({ status }: { status: AdminKycStatus }) {
  const map: Record<AdminKycStatus, { label: string; variant: keyof typeof tone }> = {
    NOT_STARTED: { label: 'Not started', variant: 'neutral' },
    UNDER_REVIEW: { label: 'Under review', variant: 'warning' },
    APPROVED: { label: 'Verified', variant: 'profit' },
    REJECTED: { label: 'Rejected', variant: 'loss' },
  }
  const m = map[status]
  return <Pill label={m.label} variant={m.variant} />
}

export function AdminAccountPill({ status }: { status: AdminAccountStatus }) {
  const map: Record<AdminAccountStatus, { label: string; variant: keyof typeof tone }> = {
    PENDING_EMAIL: { label: 'Pending email', variant: 'warning' },
    PENDING_KYC: { label: 'Pending KYC', variant: 'info' },
    VERIFIED: { label: 'Verified', variant: 'profit' },
    RESTRICTED: { label: 'Restricted', variant: 'warning' },
    SUSPENDED: { label: 'Suspended', variant: 'loss' },
    REJECTED: { label: 'Rejected', variant: 'loss' },
  }
  const m = map[status]
  return <Pill label={m.label} variant={m.variant} />
}

export function AdminDepositPill({ status }: { status: AdminDepositStatus }) {
  const map: Record<AdminDepositStatus, { label: string; variant: keyof typeof tone }> = {
    PENDING: { label: 'Pending', variant: 'neutral' },
    UNDER_REVIEW: { label: 'Under review', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'profit' },
    REJECTED: { label: 'Rejected', variant: 'loss' },
    NEED_INFO: { label: 'Need info', variant: 'info' },
  }
  const m = map[status]
  return <Pill label={m.label} variant={m.variant} />
}

export function AdminWithdrawalPill({ status }: { status: AdminWithdrawalStatus }) {
  const map: Record<AdminWithdrawalStatus, { label: string; variant: keyof typeof tone }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'info' },
    REJECTED: { label: 'Rejected', variant: 'loss' },
    PAID: { label: 'Paid', variant: 'profit' },
  }
  const m = map[status]
  return <Pill label={m.label} variant={m.variant} />
}
