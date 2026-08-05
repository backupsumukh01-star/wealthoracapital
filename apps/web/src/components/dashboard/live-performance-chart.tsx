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

import { GlowPanel } from '@/components/dashboard/glow-panel'
import { Money } from '@/components/common/money'
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
  { id: 'ALL', label: 'ALL' },
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; payload: { profit: string } }[]
  label?: string
}) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="glass-strong rounded-xl border border-glass-line px-3 py-2 shadow-e3">
      <p className="text-caption text-fg-subtle">{label}</p>
      <p className="mt-0.5 text-body-sm font-medium tabular-nums text-fg">
        ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
      <p className="text-caption text-profit">
        Day P/L <Money value={payload[0].payload.profit} signed size="sm" />
      </p>
    </div>
  )
}

/** TradingView-style live equity chart. */
export function LivePerformanceChart() {
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
        profit: p.profit,
      }))
    }
    if (!wallet) return []
    return [
      { date: 'Start', balance: '0.00', balanceNum: 0, profit: '0.00' },
      {
        date: 'Now',
        balance: wallet.availableBalance,
        balanceNum: Number(wallet.availableBalance),
        profit: summary?.today.profit ?? '0.00',
      },
    ]
  }, [wallet, chartPoints, summary?.today.profit])

  return (
    <GlowPanel glow={false} className="h-full group/chart">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-overline text-accent-300">Live performance</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <Money value={wallet?.availableBalance ?? '0.00'} size="lg" />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Chart range"
          className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-line bg-inset/60 p-1"
        >
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-caption font-medium transition-colors',
                range === r.id
                  ? 'bg-accent-500/20 text-accent-200 shadow-e1'
                  : 'text-fg-subtle hover:text-fg',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-[220px] w-full min-w-0 overflow-hidden transition-[filter] duration-500 group-hover/chart:drop-shadow-[0_0_28px_rgba(18,214,160,0.22)] sm:h-[280px]">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center text-body-sm text-fg-subtle">
            No performance data yet.
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#12D6A0" stopOpacity={0.35} />
                <stop offset="70%" stopColor="#12D6A0" stopOpacity={0.04} />
                <stop offset="100%" stopColor="#12D6A0" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="equityStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5EF2C4" />
                <stop offset="50%" stopColor="#12D6A0" />
                <stop offset="100%" stopColor="#2AE8FF" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7C8F', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={['dataMin - 80', 'dataMax + 80']}
              tick={{ fill: '#6B7C8F', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgb(18 214 160 / 0.35)' }} />
            <Area
              type="monotone"
              dataKey="balanceNum"
              stroke="url(#equityStroke)"
              strokeWidth={2.5}
              fill="url(#equityFill)"
              animationDuration={900}
              animationEasing="ease-out"
              activeDot={{ r: 5, fill: '#12D6A0', stroke: '#07131C', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </GlowPanel>
  )
}
