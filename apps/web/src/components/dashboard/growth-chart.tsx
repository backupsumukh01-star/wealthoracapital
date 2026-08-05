'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { SectionHeader } from '@/components/common/page-header'
import { Money } from '@/components/common/money'
import { Card } from '@/components/ui/card'
import type { ChartRange } from '@/lib/dashboard-data'
import { useWalletSummary } from '@/features/wallet/hooks'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

const RANGES: { id: ChartRange; label: string }[] = [
  { id: '1D', label: '1D' },
  { id: '1W', label: '1W' },
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: '1Y', label: '1Y' },
  { id: 'ALL', label: 'All' },
]

export function GrowthChart() {
  const { session } = useSession()
  const { data: summary } = useWalletSummary({ enabled: Boolean(session) })
  const [range, setRange] = useState<ChartRange>('1M')
  const wallet = summary?.wallet ?? session?.wallet
  const chartPoints = summary?.chart?.points

  const data = useMemo(() => {
    if (chartPoints && chartPoints.length > 0) {
      return chartPoints.map((p) => ({
        date: p.date,
        balance: p.balance,
        balanceNum: Number(p.balance),
      }))
    }
    if (!wallet) return []
    return [
      { date: 'Start', balance: '0.00', balanceNum: 0 },
      { date: 'Now', balance: wallet.availableBalance, balanceNum: Number(wallet.availableBalance) },
    ]
  }, [wallet, chartPoints])

  return (
    <Card variant="glass" padded="md" className="h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionHeader
            title="Portfolio growth"
            description="Balance over time, including deposits and withdrawals."
            className="pb-0"
          />
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <Money value={wallet?.availableBalance ?? '0.00'} size="lg" />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Chart range"
          className="flex shrink-0 gap-1 rounded-lg border border-line bg-inset/50 p-1"
        >
          {RANGES.map((item) => {
            const selected = range === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRange(item.id)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-caption font-medium transition-colors',
                  selected
                    ? 'bg-raised text-fg shadow-e1'
                    : 'text-fg-subtle hover:text-fg-muted',
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 h-72 w-full min-w-0 overflow-hidden sm:h-80 lg:h-[22rem]">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center text-body-sm text-fg-subtle">
            No performance data yet.
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dashGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-400)" stopOpacity={0.38} />
                <stop offset="100%" stopColor="var(--accent-400)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-subtle)" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-overlay)',
                border: '1px solid var(--border-default)',
                borderRadius: 10,
                color: 'var(--text-primary)',
                boxShadow: 'var(--elev-3)',
              }}
              labelStyle={{ color: 'var(--text-tertiary)' }}
              formatter={(value: number) => [
                `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                'Balance',
              ]}
            />
            <Area
              type="monotone"
              dataKey="balanceNum"
              stroke="var(--accent-300)"
              strokeWidth={2.5}
              fill="url(#dashGrowthFill)"
              animationDuration={1100}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
