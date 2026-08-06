'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowDownToLine } from 'lucide-react'

import { DualMoney } from '@/components/common/dual-money'
import { PageHeader } from '@/components/common/page-header'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDeposits } from '@/features/deposits/hooks'
import { formatDateTime } from '@/lib/format'

export function DepositHistoryPanel() {
  const { data, isLoading } = useDeposits()
  const rows = data?.items ?? []

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Deposit history"
        description="Every deposit request with status and method."
        eyebrow={
          <Link href={ROUTES.dashboard.deposit} className="hover:text-fg">
            ← Deposit
          </Link>
        }
        actions={
          <Button asChild>
            <Link href={ROUTES.dashboard.deposit}>
              <ArrowDownToLine aria-hidden />
              New deposit
            </Link>
          </Button>
        }
      />

      <Card variant="glass" className="overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-body-sm text-fg-muted">Loading deposits…</p>
        ) : rows.length === 0 ? (
          <PremiumEmptyState
            title="No deposits yet"
            description="When you submit a deposit, it will appear here with live status updates."
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
                    {row.method?.name ?? row.reference} · {formatDateTime(row.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <DualMoney
                    usd={row.amount}
                    inr={row.amountInr ?? row.depositInr}
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
