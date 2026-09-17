'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import { useWallet } from '@/features/wallet/hooks'
import { useSession } from '@/providers/session-provider'

const COLORS = {
  available: '#3CCB91',
  invested: '#8FA8C0',
  locked: '#D9A441',
} as const

export function PortfolioAllocation() {
  const { session } = useSession()
  const { data: wallet, isLoading } = useWallet({ enabled: Boolean(session) })

  const slices = useMemo(() => {
    const available = Math.max(0, Number(wallet?.availableBalance ?? 0))
    const invested = Math.max(0, Number(wallet?.investedAmount ?? 0))
    const locked = Math.max(0, Number(wallet?.lockedBalance ?? 0))
    const total = available + invested + locked
    if (!total) return []

    return [
      { id: 'available', label: 'Available', value: available, color: COLORS.available },
      { id: 'invested', label: 'Invested', value: invested, color: COLORS.invested },
      { id: 'locked', label: 'Locked', value: locked, color: COLORS.locked },
    ]
      .filter((s) => s.value > 0)
      .map((s) => ({
        ...s,
        pct: Math.round((s.value / total) * 100),
      }))
  }, [wallet])

  const data = slices.map((s) => ({ name: s.label, value: s.pct, color: s.color }))
  const investedPct = slices.find((s) => s.id === 'invested')?.pct ?? 0

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2">
      <p className="text-overline text-accent-300">Portfolio allocation</p>
      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading balances…</p>
      ) : data.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No balances to allocate yet.</p>
      ) : (
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-[140px] w-[140px] shrink-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={3}
                  stroke="none"
                  animationDuration={900}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Invested</p>
                <p className="text-body-sm font-semibold text-fg">{investedPct}%</p>
              </div>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2">
            {slices.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-caption">
                <span className="flex items-center gap-2 text-fg-muted">
                  <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </span>
                <span className="tabular-nums text-fg">{s.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
