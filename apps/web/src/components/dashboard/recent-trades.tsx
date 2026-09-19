'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { SectionHeader } from '@/components/common/page-header'
import { Percent } from '@/components/common/percent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { useTrades } from '@/features/trades/hooks'
import { formatDate } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

export function RecentTrades() {
  const { session } = useSession()
  const { data } = useTrades(undefined, { enabled: Boolean(session) })
  const trades = (data?.items ?? []).slice(0, 5).map((t) => ({
    id: t.id,
    date: t.closedAt || t.date,
    pair: t.pair,
    direction: (String(t.direction).includes('SELL') || String(t.direction).includes('SHORT')
      ? 'SELL'
      : 'BUY') as 'BUY' | 'SELL',
    entry: t.entryPrice,
    exit: t.exitPrice,
    returnPct: String(t.returnPct).replace('%', ''),
    status: (t.outcome === 'WIN' ? 'WIN' : t.outcome === 'LOSS' ? 'LOSS' : 'FLAT') as
      | 'WIN'
      | 'LOSS'
      | 'FLAT',
  }))

  if (trades.length === 0) {
    return (
      <Card variant="glass" padded="md">
        <SectionHeader
          title="Recent trading performance"
          description="The most recent positions the desk closed."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.dashboard.trades}>View all</Link>
            </Button>
          }
        />
        <PremiumEmptyState
          className="py-8"
          title="No trades yet"
          description="Closed trades will appear here once the desk publishes them."
        />
      </Card>
    )
  }

  return (
    <Card variant="glass" padded="md">
      <SectionHeader
        title="Recent trading performance"
        description="The most recent positions the desk closed."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.dashboard.trades}>View all</Link>
          </Button>
        }
      />
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Return</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{formatDate(t.date)}</TableCell>
                <TableCell>{t.pair}</TableCell>
                <TableCell>
                  <Badge tone={t.direction === 'BUY' ? 'profit' : 'loss'}>{t.direction}</Badge>
                </TableCell>
                <TableCell>
                  <Percent value={t.returnPct} showArrow />
                </TableCell>
                <TableCell>{t.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
