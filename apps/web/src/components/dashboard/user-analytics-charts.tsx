'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Money } from '@/components/common/money'
import { SectionHeader } from '@/components/common/page-header'
import { GlowPanel } from '@/components/dashboard/glow-panel'
import { useWalletSummary } from '@/features/wallet/hooks'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name?: string; payload?: { profit?: string; returnPct?: string } }>
  label?: string
}) {
  if (!active || !payload?.[0]) return null
  const row = payload[0]
  return (
    <div className="glass-strong rounded-xl border border-glass-line px-3 py-2 shadow-e3">
      <p className="text-caption text-fg-subtle">{label}</p>
      <p className="mt-0.5 text-body-sm font-medium tabular-nums text-fg">
        ${Number(row.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
      {row.payload?.profit ? (
        <p className="text-caption text-profit">
          Day P/L <Money value={row.payload.profit} signed size="sm" />
        </p>
      ) : null}
    </div>
  )
}

/** Investor analytics — daily profit bars + cumulative equity from wallet summary. */
export function UserAnalyticsCharts({ className }: { className?: string }) {
  const { session } = useSession()
  const { data: summary } = useWalletSummary({ enabled: Boolean(session) })
  const charts = summary?.analyticsCharts

  const daily = useMemo(
    () =>
      (charts?.dailyProfit ?? []).map((p) => ({
        date: p.label || p.date,
        profitNum: Number(p.profit),
        profit: p.profit,
        cumulativeNum: Number(p.cumulativeProfit),
        balanceNum: Number(p.balance),
        returnPct: p.returnPct,
      })),
    [charts?.dailyProfit],
  )

  const monthly = useMemo(
    () =>
      (charts?.monthly ?? []).map((m) => ({
        month: m.month,
        profitNum: Number(m.profit),
        profit: m.profit,
        returnPct: m.returnPct,
      })),
    [charts?.monthly],
  )

  const empty = daily.length === 0 && monthly.length === 0

  return (
    <div className={cn('grid gap-5 lg:grid-cols-2', className)}>
      <GlowPanel glow={false} className="group/chart">
        <SectionHeader
          title="Daily profit"
          description={`Credits across ${charts?.range ?? '90d'} — each publish day shown.`}
          as="h3"
        />
        <div className="mt-5 h-[220px] w-full min-w-0 sm:h-[260px]">
          {empty ? (
            <div className="grid h-full place-items-center text-body-sm text-fg-subtle">
              No analytics yet — returns appear after the desk publishes.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6B7C8F', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: '#6B7C8F', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(60 203 145 / 0.08)' }} />
                <Bar
                  dataKey="profitNum"
                  fill="#3CCB91"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlowPanel>

      <GlowPanel glow={false} className="group/chart">
        <SectionHeader
          title="Cumulative return"
          description="Compounded profit credited to your investment wallet."
          as="h3"
        />
        <div className="mt-5 h-[220px] w-full min-w-0 sm:h-[260px]">
          {empty ? (
            <div className="grid h-full place-items-center text-body-sm text-fg-subtle">
              Cumulative curve builds as settlements land.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsCumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4D9DF" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#D4D9DF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6B7C8F', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: '#6B7C8F', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgb(212 217 223 / 0.28)' }} />
                <Area
                  type="monotone"
                  dataKey="cumulativeNum"
                  stroke="#D4D9DF"
                  strokeWidth={2.25}
                  fill="url(#analyticsCumFill)"
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlowPanel>

      {monthly.length > 0 ? (
        <GlowPanel glow={false} className="lg:col-span-2">
          <SectionHeader title="Monthly profit" description="Calendar months with credits." as="h3" />
          <div className="mt-5 h-[200px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6B7C8F', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6B7C8F', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(60 203 145 / 0.08)' }} />
                <Bar dataKey="profitNum" fill="#3CCB91" radius={[6, 6, 0, 0]} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlowPanel>
      ) : null}
    </div>
  )
}
