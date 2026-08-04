'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { StatusTimeline } from '@/components/dashboard/status-timeline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SAMPLE_TRADES } from '@/lib/landing-data'
import { TRADE_HISTORY } from '@/lib/dashboard-data'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

/** Investor trade detail — Admin OS published trades, then investor demo history. */
export function TradeDetailWorkspace() {
  const params = useParams<{ tradeId: string }>()
  const tradeId = decodeURIComponent(params.tradeId)
  const { ready, publishedTrades, state } = useAdminOs()

  const fromOs =
    publishedTrades.find((t) => t.id === tradeId) ??
    state.trades.find((t) => t.id === tradeId)

  const fromHistory = TRADE_HISTORY.find((t) => t.id === tradeId)
  const fromSample = SAMPLE_TRADES.find(
    (t, i) => `TRD_${1000 + i}` === tradeId || `${t.pair}-${t.date}` === tradeId,
  )

  if (ready && !fromOs && !fromHistory && !fromSample) {
    return (
      <div className="space-y-4">
        <PageHeader title="Trade not found" description={`No published trade matches ${tradeId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.dashboard.trades}>Back to trade history</Link>
        </Button>
      </div>
    )
  }

  const pair = fromOs?.pair ?? fromHistory?.pair ?? fromSample?.pair ?? '—'
  const direction = fromOs?.direction ?? fromHistory?.direction ?? fromSample?.direction ?? '—'
  const entry = fromOs?.entry ?? fromHistory?.entry ?? fromSample?.entry ?? '—'
  const exit = fromOs?.exit ?? fromHistory?.exit ?? fromSample?.exit ?? '—'
  const profitPct =
    fromOs?.profitPct ?? fromHistory?.returnPct ?? fromSample?.returnPct ?? '0'
  const notes =
    fromOs?.notes ??
    (fromHistory
      ? `${fromHistory.pair} · ${fromHistory.lot} lots · ${fromHistory.pips} pips`
      : 'Desk-verified session trade.')
  const day =
    fromOs?.tradingDay ??
    fromHistory?.date?.slice(0, 10) ??
    fromSample?.date ??
    '—'
  const publishedAt = fromOs?.publishedAt ?? fromHistory?.date
  const negative = String(profitPct).trim().startsWith('-')

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <PageHeader
        title={`${pair} · ${direction}`}
        description="Everything recorded about this position, exactly as it was published."
        eyebrow={
          <Link href={ROUTES.dashboard.trades} className="hover:text-fg">
            ← Trade history
          </Link>
        }
        actions={
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-1 text-caption font-medium',
              negative ? 'border-loss/25 bg-loss/15 text-loss' : 'border-profit/25 bg-profit/15 text-profit',
            )}
          >
            {negative ? '' : '+'}
            {profitPct}%
          </span>
        }
      />

      <Card variant="glass" className="min-w-0 p-5 sm:p-6">
        <SectionHeader title="Position" description={`Reference ${tradeId}`} />
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Pair', pair],
            ['Direction', direction],
            ['Trading day', day],
            ['Entry', entry],
            ['Exit', exit],
            ['Result', `${negative ? '' : '+'}${profitPct}%`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-caption text-fg-subtle">{k}</dt>
              <dd className="mt-0.5 tabular-nums text-body-sm font-medium text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Timeline" as="h3" />
          <div className="mt-4">
            <StatusTimeline
              activeIndex={3}
              steps={[
                { id: 'open', label: `Opened · Entry ${entry}` },
                { id: 'close', label: `Closed · Exit ${exit}` },
                {
                  id: 'publish',
                  label: publishedAt
                    ? `Published · ${formatDateTime(publishedAt)}`
                    : 'Published to investors',
                },
              ]}
            />
          </div>
        </Card>
        <Card variant="glass" className="p-5 sm:p-6">
          <SectionHeader title="Desk notes" as="h3" />
          <p className="mt-4 text-body-sm leading-relaxed text-fg-muted">{notes}</p>
          {fromOs?.risk ? (
            <p className="mt-3 text-caption text-fg-subtle">Risk · {fromOs.risk}</p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
