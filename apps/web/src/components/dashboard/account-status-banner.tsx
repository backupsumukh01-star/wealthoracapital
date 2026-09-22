'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { accountAccessMessage, canTransact, isKycPendingReview } from '@/lib/account-access'
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

/** Compact KYC status strip — shown across the investor shell when money moves are locked. */
export function AccountStatusBanner({ className }: { className?: string }) {
  const { session, isLoading } = useSession()
  if (isLoading || !session) return null
  if (canTransact(session.user.kycStatus)) return null

  const access = accountAccessMessage(session.user.kycStatus)
  const tone = toneForStatus(session.user.kycStatus)
  const pending = isKycPendingReview(session.user.kycStatus)
  const showAction = Boolean(access.nextActionHref && access.nextActionLabel)

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3',
        toneClass[tone],
        className,
      )}
    >
      <div className="flex min-w-0 gap-2.5">
        <AlertTriangle
          className={cn(
            'mt-0.5 size-4 shrink-0',
            tone === 'warning' && 'text-warning',
            tone === 'loss' && 'text-loss',
            tone === 'info' && 'text-info',
          )}
          aria-hidden
        />
        <div className="min-w-0 space-y-0.5">
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
              badgeClass[tone],
            )}
          >
            {access.label}
          </span>
          <p className="text-caption text-fg-muted sm:text-body-sm">{access.description}</p>
          {pending ? (
            <p className="text-[11px] text-fg-subtle">Deposit and withdrawal remain locked.</p>
          ) : null}
        </div>
      </div>
      {showAction ? (
        <Button asChild size="sm" className="shrink-0 self-start sm:self-center">
          <Link href={access.nextActionHref!}>
            {access.nextActionLabel}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
