'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { DateTime } from '@/components/common/date-time'
import { Money } from '@/components/common/money'
import { SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RECENT_TRANSACTIONS } from '@/lib/dashboard-data'
import { cn } from '@/lib/cn'

const ICON_MAP: Record<(typeof RECENT_TRANSACTIONS)[number]['type'], LucideIcon> = {
  DEPOSIT: ArrowDownToLine,
  WITHDRAWAL: ArrowUpFromLine,
  DAILY_PROFIT: TrendingUp,
  ADJUSTMENT: Scale,
}

export function RecentTransactions() {
  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader
        title="Recent transactions"
        description="The last movements on your ledger."
        as="h3"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.dashboard.transactions}>View all</Link>
          </Button>
        }
      />

      <ul className="divide-y divide-line">
        {RECENT_TRANSACTIONS.map((tx) => {
          const Icon = ICON_MAP[tx.type]
          const isOut = Number(tx.amount) < 0
          return (
            <li key={tx.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg',
                  isOut ? 'bg-loss-bg text-loss' : 'bg-profit-bg text-profit',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-fg">{tx.label}</p>
                <p className="truncate text-caption text-fg-subtle">
                  {tx.reference} · <DateTime value={tx.date} format="relative" />
                </p>
              </div>
              <Money value={tx.amount} signed className="text-body-sm font-medium" />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
