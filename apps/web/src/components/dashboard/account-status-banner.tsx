'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { accountAccessMessage, canTransact } from '@/lib/account-access'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

const toneClass = {
  profit: 'border-profit/25 bg-profit/10',
  warning: 'border-warning/25 bg-warning/10',
  info: 'border-info/25 bg-info/10',
  loss: 'border-loss/25 bg-loss/10',
  neutral: 'border-line bg-inset/50',
} as const

const badgeClass = {
  profit: 'bg-profit/20 text-profit',
  warning: 'bg-warning/20 text-warning',
  info: 'bg-info/20 text-info',
  loss: 'bg-loss/20 text-loss',
  neutral: 'bg-hover text-fg-muted',
} as const

function toneForStatus(kycStatus: string | undefined) {
  switch (kycStatus) {
    case 'APPROVED':
      return 'profit' as const
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
    case 'NEED_MORE_INFO':
      return 'warning' as const
    case 'REJECTED':
    case 'SUSPENDED':
      return 'loss' as const
    default:
      return 'info' as const
  }
}

/** Status strip — badge, description, next action. Driven by API session KYC. */
export function AccountStatusBanner({ className }: { className?: string }) {
  const { session, isLoading } = useSession()
  if (isLoading || !session) return null
  if (canTransact(session.user.kycStatus)) return null

  const access = accountAccessMessage(session.user.kycStatus)
  const tone = toneForStatus(session.user.kycStatus)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        toneClass[tone],
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            badgeClass[tone],
          )}
        >
          {access.label}
        </span>
        <p className="text-body-sm text-fg-muted">{access.description}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={access.nextActionHref}>
          {access.nextActionLabel}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  )
}
