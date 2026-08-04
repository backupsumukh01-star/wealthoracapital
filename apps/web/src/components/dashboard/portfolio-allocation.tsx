'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import { PORTFOLIO_ALLOCATION } from '@/lib/dashboard-data'

export function PortfolioAllocation() {
  const data = useMemo(
    () => PORTFOLIO_ALLOCATION.map((s) => ({ name: s.label, value: s.value, color: s.color })),
    [],
  )

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2">
      <p className="text-overline text-accent-300">Portfolio allocation</p>
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
              <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Active</p>
              <p className="text-body-sm font-semibold text-fg">72%</p>
            </div>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {PORTFOLIO_ALLOCATION.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-caption">
              <span className="flex items-center gap-2 text-fg-muted">
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="tabular-nums text-fg">{s.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
