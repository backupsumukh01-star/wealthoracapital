'use client'

import Link from 'next/link'
import { ROUTES, type LedgerEntry, type LedgerEntryType } from '@meridian/shared'
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
import { useWalletTransactions } from '@/features/wallet/hooks'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

const ICON_MAP: Partial<Record<LedgerEntryType, LucideIcon>> = {
  DEPOSIT_APPROVED: ArrowDownToLine,
  WITHDRAWAL_LOCKED: ArrowUpFromLine,
  WITHDRAWAL_COMPLETED: ArrowUpFromLine,
  WITHDRAWAL_REFUNDED: ArrowUpFromLine,
  PROFIT_DISTRIBUTION: TrendingUp,
  PROFIT_REVERSAL: TrendingUp,
  ADJUSTMENT_CREDIT: Scale,
  ADJUSTMENT_DEBIT: Scale,
  FEE: Scale,
  BONUS: TrendingUp,
  TRANSFER: Scale,
  REFUND: ArrowDownToLine,
  REVERSAL: Scale,
}

function rowLabel(entry: LedgerEntry) {
  if (entry.description?.trim()) return entry.description
  return entry.type.replaceAll('_', ' ')
}

function rowReference(entry: LedgerEntry) {
  if (entry.referenceId) return entry.referenceId
  if (entry.referenceType) return entry.referenceType
  return entry.id.slice(0, 8)
}

export function RecentTransactions() {
  const { session } = useSession()
  const { data, isLoading } = useWalletTransactions(
    { limit: 8 },
    { enabled: Boolean(session) },
  )
  const items = data?.items ?? []

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

      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading transactions…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No transactions yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((tx) => {
            const Icon = ICON_MAP[tx.type] ?? Scale
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
                  <p className="truncate text-body-sm font-medium text-fg">{rowLabel(tx)}</p>
                  <p className="truncate text-caption text-fg-subtle">
                    {rowReference(tx)} · <DateTime value={tx.createdAt} format="relative" />
                  </p>
                </div>
                <Money value={tx.amount} signed className="text-body-sm font-medium" />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
