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
import { RECENT_TRADES } from '@/lib/dashboard-data'
import { formatDate } from '@/lib/format'

export function RecentTrades() {
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

      {/* Mobile cards — financial tables should not force horizontal scroll on phones. */}
      <ul className="space-y-3 md:hidden">
        {RECENT_TRADES.map((trade) => (
          <li
            key={trade.id}
            className="rounded-xl border border-line bg-inset/35 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body-sm font-medium text-fg">{trade.pair}</p>
                <p className="text-caption text-fg-subtle">{formatDate(trade.date)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={trade.direction === 'BUY' ? 'accent' : 'neutral'} size="sm">
                  {trade.direction}
                </Badge>
                <Badge tone={trade.status === 'WIN' ? 'profit' : 'loss'} size="sm">
                  {trade.status}
                </Badge>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-caption">
              <div>
                <dt className="text-fg-subtle">Entry</dt>
                <dd className="tabular-nums text-fg">{trade.entry}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Exit</dt>
                <dd className="tabular-nums text-fg">{trade.exit}</dd>
              </div>
              <div className="text-right">
                <dt className="text-fg-subtle">Profit</dt>
                <dd>
                  <Percent value={trade.returnPct} />
                </dd>
              </div>
            </dl>
            <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
              <Link href={ROUTES.dashboard.trade(trade.id)}>View details</Link>
            </Button>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Exit</TableHead>
              <TableHead className="text-right">Profit %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RECENT_TRADES.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  {formatDate(trade.date)}
                </TableCell>
                <TableCell className="font-medium text-fg">{trade.pair}</TableCell>
                <TableCell>
                  <Badge tone={trade.direction === 'BUY' ? 'accent' : 'neutral'} size="sm">
                    {trade.direction}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-fg-muted">
                  {trade.entry}
                </TableCell>
                <TableCell className="text-right tabular-nums text-fg-muted">
                  {trade.exit}
                </TableCell>
                <TableCell className="text-right">
                  <Percent value={trade.returnPct} />
                </TableCell>
                <TableCell>
                  <Badge tone={trade.status === 'WIN' ? 'profit' : 'loss'} size="sm">
                    {trade.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={ROUTES.dashboard.trade(trade.id)}>Details</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
