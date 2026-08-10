'use client'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import {
  formatMarketChangePct,
  marketStatusBadge,
  useMarketQuotes,
} from '@/features/markets/hooks'
import { cn } from '@/lib/cn'

/** Admin view of the same centralized market feed used by public/investor UI. */
export function AdminTickerWorkspace() {
  const { data, isLoading, isFetching, dataUpdatedAt, refetch, isError } = useMarketQuotes()
  const quotes = data?.quotes ?? []
  const badge = marketStatusBadge(data?.status)

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Live Market Ticker"
        description="Same market-data feed as the public header ticker and investor dashboard. Prices are never edited here."
        actions={
          <button
            type="button"
            className="rounded-lg border border-line bg-inset/60 px-3 py-2 text-caption text-fg-muted hover:text-fg"
            onClick={() => void refetch()}
          >
            Refresh{isFetching ? '…' : ''}
          </button>
        }
      />

      <AdminPanel>
        <AdminPanelHeader
          title="Feed status"
          description="LIVE only when the provider request succeeds with fresh data."
        />
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
              badge.live
                ? 'border-profit/30 bg-profit/10 text-profit'
                : data?.status === 'DELAYED'
                  ? 'border-warning/30 bg-warning/10 text-warning'
                  : 'border-line bg-inset/60 text-fg-subtle',
            )}
          >
            {badge.label}
          </span>
          {data?.updatedAt ? (
            <span className="text-caption tabular-nums text-fg-subtle">
              Updated {new Date(data.updatedAt).toISOString().slice(11, 19)} UTC
            </span>
          ) : null}
          {data?.asOfLabel ? (
            <span className="text-caption text-fg-subtle">{data.asOfLabel}</span>
          ) : null}
          {data?.message ? (
            <span className="text-caption text-fg-muted">{data.message}</span>
          ) : null}
          {isError ? (
            <span className="text-caption text-loss">Request failed — not showing LIVE.</span>
          ) : null}
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Current quotes"
          description={`${quotes.length} symbols · shared with marketing + dashboard`}
        />
        {isLoading && quotes.length === 0 ? (
          <p className="p-4 text-body-sm text-fg-subtle sm:p-5">Loading market data…</p>
        ) : quotes.length === 0 ? (
          <p className="p-4 text-body-sm text-fg-subtle sm:p-5">
            {data?.message || 'Market data unavailable'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-body-sm">
              <thead className="border-b border-line text-caption text-fg-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Symbol</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Type</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Price</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {quotes.map((q) => {
                  const { text, tone } = formatMarketChangePct(q.changePercent)
                  return (
                    <tr key={q.symbol}>
                      <td className="px-4 py-3 font-medium text-fg sm:px-5">{q.symbol}</td>
                      <td className="px-4 py-3 capitalize text-fg-muted sm:px-5">{q.type}</td>
                      <td className="px-4 py-3 tabular-nums text-fg sm:px-5">{q.price}</td>
                      <td
                        className={cn(
                          'px-4 py-3 tabular-nums sm:px-5',
                          tone === 'up' && 'text-profit',
                          tone === 'down' && 'text-loss',
                          tone === 'neutral' && 'text-fg-subtle',
                        )}
                      >
                        {text}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {dataUpdatedAt ? (
          <p className="border-t border-line/60 px-4 py-3 text-[10px] tabular-nums text-fg-subtle sm:px-5">
            Client cache refreshed {new Date(dataUpdatedAt).toISOString().slice(11, 19)} UTC
          </p>
        ) : null}
      </AdminPanel>
    </div>
  )
}
