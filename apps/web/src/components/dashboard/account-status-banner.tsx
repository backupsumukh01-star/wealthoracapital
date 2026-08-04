'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'
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

/** Status strip — badge, description, next action. Driven by shared lifecycle store. */
export function AccountStatusBanner({ className }: { className?: string }) {
  const { accountStatus, ready } = useInvestorLifecycle()
  if (!ready) return null
  if (accountStatus.id === 'ACTIVE') return null

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        toneClass[accountStatus.tone],
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            badgeClass[accountStatus.tone],
          )}
        >
          {accountStatus.label}
        </span>
        <p className="text-body-sm text-fg-muted">{accountStatus.description}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={accountStatus.nextActionHref}>
          {accountStatus.nextActionLabel}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  )
}
