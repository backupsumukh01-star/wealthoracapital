'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { accountAccessMessage, canTransact } from '@/lib/account-access'
import { useSession } from '@/providers/session-provider'
import { ROUTES } from '@meridian/shared'

/**
 * Soft lock for deposit/withdraw surfaces when KYC is not approved.
 * Backend still enforces KYC — this only improves the pending UX.
 */
export function KycFinanceLock({
  children,
  action = 'deposit',
}: {
  children: ReactNode
  action?: 'deposit' | 'withdraw'
}) {
  const { session, isLoading } = useSession()
  if (isLoading) return null
  if (canTransact(session?.user.kycStatus)) return <>{children}</>

  const access = accountAccessMessage(session?.user.kycStatus)
  const verb = action === 'withdraw' ? 'withdraw' : 'deposit'

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6">
      <Alert tone="warning" title={access.label}>
        <span className="inline-flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            {access.description} You cannot {verb} until KYC is approved.
          </span>
        </span>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={ROUTES.dashboard.root}>Back to dashboard</Link>
        </Button>
        {access.nextActionHref && access.nextActionLabel ? (
          <Button asChild variant="secondary">
            <Link href={access.nextActionHref}>{access.nextActionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
