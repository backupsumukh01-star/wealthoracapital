'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowUpFromLine } from 'lucide-react'

import { DualMoney } from '@/components/common/dual-money'
import { PageHeader } from '@/components/common/page-header'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useWithdrawals } from '@/features/withdrawals/hooks'
import { formatDateTime } from '@/lib/format'

export function WithdrawHistoryPanel() {
  const { data, isLoading } = useWithdrawals()
  const rows = data?.items ?? []

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Withdrawal history"
        description="Every payout request with destination and status."
        eyebrow={
          <Link href={ROUTES.dashboard.withdraw} className="hover:text-fg">
            ← Withdraw
          </Link>
        }
        actions={
          <Button asChild>
            <Link href={ROUTES.dashboard.withdraw}>
              <ArrowUpFromLine aria-hidden />
              New withdrawal
            </Link>
          </Button>
        }
      />

      <Card variant="glass" className="overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-body-sm text-fg-muted">Loading withdrawals…</p>
        ) : rows.length === 0 ? (
          <PremiumEmptyState
            title="No withdrawals yet"
            description="Approved payout requests will appear here with live status."
          />
        ) : (
          <ul className="divide-y divide-line/70">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-fg">{row.id}</p>
                  <p className="text-caption text-fg-subtle">
                    {row.destinationLabel} · {formatDateTime(row.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <DualMoney
                    usd={row.amount}
                    inr={row.amountInr ?? row.withdrawInr}
                    className="text-body-sm font-medium"
                  />
                  <StatusPill status={row.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
