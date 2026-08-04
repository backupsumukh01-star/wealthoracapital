'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowDownToLine } from 'lucide-react'

import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEMO_DEPOSITS } from '@/lib/investor-demo-data'
import { formatDateTime } from '@/lib/format'

export function DepositHistoryPanel() {
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
        <ul className="divide-y divide-line/70">
          {DEMO_DEPOSITS.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-fg">{row.id}</p>
                <p className="text-caption text-fg-subtle">
                  {row.method} · {row.rail} · {formatDateTime(row.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Money value={row.amount} className="text-body-sm font-medium" />
                <StatusPill status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
