'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { ROUTES } from '@meridian/shared'

import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDeposits } from '@/features/deposits/hooks'
import { useSession } from '@/providers/session-provider'

function OxapayReturnInner() {
  const params = useSearchParams()
  const ref = (params.get('ref') ?? params.get('order_id') ?? params.get('order_number') ?? '').trim()
  const { session } = useSession()
  const { data, isLoading, refetch, isFetching } = useDeposits(undefined, {
    enabled: Boolean(session),
  })
  const [ticks, setTicks] = useState(0)

  const deposit = useMemo(() => {
    const items = data?.items ?? []
    if (!ref) return items[0] ?? null
    return items.find((row) => row.reference === ref || row.id === ref) ?? null
  }, [data?.items, ref])

  useEffect(() => {
    if (!session) return
    const id = window.setInterval(() => {
      setTicks((n) => n + 1)
      void refetch()
    }, 5_000)
    return () => window.clearInterval(id)
  }, [session, refetch])

  const confirmed = deposit?.status === 'APPROVED'
  const underReview = deposit?.status === 'UNDER_REVIEW'
  const failed =
    deposit?.status === 'REJECTED' ||
    deposit?.status === 'CANCELLED' ||
    deposit?.status === 'EXPIRED'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crypto payment status"
        description="This page never credits your balance. Funds update only after OxaPay server confirmation."
      />
      <Card variant="glass" className="mx-auto max-w-lg space-y-4 p-6">
        {isLoading && !deposit ? (
          <p className="text-body-sm text-fg-subtle">Loading deposit status…</p>
        ) : !deposit ? (
          <p className="text-body-sm text-fg-subtle">
            {ref
              ? `No deposit found for reference ${ref} yet. If you just paid, wait a moment and refresh.`
              : 'No recent deposit found. Open Deposit history to track your request.'}
          </p>
        ) : confirmed ? (
          <>
            <p className="text-body-sm text-fg font-medium">Deposit confirmed</p>
            <p className="text-caption text-fg-subtle">
              {deposit.reference} · {deposit.amount} USD credited after provider verification.
            </p>
            <StatusPill status={deposit.status} />
          </>
        ) : failed ? (
          <>
            <p className="text-body-sm text-fg font-medium">Payment not completed</p>
            <p className="text-caption text-fg-subtle">
              {deposit.reference} is {deposit.status.toLowerCase()}. No balance was credited.
            </p>
            <StatusPill status={deposit.status} />
          </>
        ) : underReview ? (
          <>
            <p className="text-body-sm text-fg font-medium">Payment under review</p>
            <p className="text-caption text-fg-subtle">
              Verification needs attention. This browser return does not credit funds.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={deposit.status} />
              <span className="text-caption text-fg-subtle">
                {deposit.reference}
                {isFetching || ticks > 0 ? ' · Checking…' : ''}
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-body-sm text-fg font-medium">
              Payment received / processing
            </p>
            <p className="text-caption text-fg-subtle">
              Your balance will update after payment confirmation. Do not treat this browser return
              as a successful credit.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={deposit.status} />
              <span className="text-caption text-fg-subtle">
                {deposit.reference}
                {isFetching || ticks > 0 ? ' · Checking…' : ''}
              </span>
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            Refresh status
          </Button>
          <Button asChild>
            <Link href={ROUTES.dashboard.deposit}>Back to deposits</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={ROUTES.dashboard.depositHistory}>Deposit history</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function OxapayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="Crypto payment status" description="Loading…" />
        </div>
      }
    >
      <OxapayReturnInner />
    </Suspense>
  )
}
