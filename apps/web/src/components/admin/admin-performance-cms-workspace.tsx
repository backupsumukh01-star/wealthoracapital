'use client'

import { toast } from 'sonner'
import { Send } from 'lucide-react'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminPerformanceCmsWorkspace() {
  const { state, updatePerformance, publishPerformance } = useAdminOs()
  const p = state.performance

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Performance Management"
        description="Publish programme stats. Landing page, investor dashboard, and history stay in sync."
        actions={
          <Button
            type="button"
            onClick={() => {
              publishPerformance()
              toast.success('Performance published to landing + dashboards')
            }}
          >
            <Send aria-hidden />
            Publish
          </Button>
        }
      />

      <AdminPanel>
        <AdminPanelHeader
          title="Headline metrics"
          description={
            p.publishedAt
              ? `Last published ${new Date(p.publishedAt).toLocaleString()}`
              : 'Not published yet'
          }
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          {(
            [
              ['dailyReturn', 'Daily return %'],
              ['weeklyReturn', 'Weekly return %'],
              ['monthlyReturn', 'Monthly return %'],
              ['yearlyReturn', 'Yearly performance %'],
              ['bestDay', 'Best day %'],
              ['worstDay', 'Worst day %'],
              ['winningPct', 'Winning %'],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label}>
              <Input
                value={p[key]}
                onChange={(e) => updatePerformance({ [key]: e.target.value })}
              />
            </FormField>
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel>
          <AdminPanelHeader title="Monthly timeline" description="Graph values for charts." />
          <ul className="max-h-80 divide-y divide-white/[0.04] overflow-y-auto">
            {p.monthly.map((m, i) => (
              <li key={m.month} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="w-10 text-caption text-fg-muted">{m.month}</span>
                <Input
                  className="max-w-[8rem]"
                  value={String(m.returnPct)}
                  onChange={(e) => {
                    const next = [...p.monthly]
                    next[i] = { ...m, returnPct: Number.parseFloat(e.target.value) || 0 }
                    updatePerformance({ monthly: next })
                  }}
                />
                <span className="text-caption text-fg-subtle">%</span>
              </li>
            ))}
          </ul>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Yearly performance" />
          <ul className="divide-y divide-white/[0.04]">
            {p.yearly.map((y, i) => (
              <li key={y.year} className="grid gap-2 px-4 py-3 sm:grid-cols-3 sm:px-5">
                <Input
                  value={y.year}
                  onChange={(e) => {
                    const next = [...p.yearly]
                    next[i] = { ...y, year: e.target.value }
                    updatePerformance({ yearly: next })
                  }}
                />
                <Input
                  value={String(y.returnPct)}
                  onChange={(e) => {
                    const next = [...p.yearly]
                    next[i] = { ...y, returnPct: Number.parseFloat(e.target.value) || 0 }
                    updatePerformance({ yearly: next })
                  }}
                />
                <Input
                  value={y.profitLabel}
                  onChange={(e) => {
                    const next = [...p.yearly]
                    next[i] = { ...y, profitLabel: e.target.value }
                    updatePerformance({ yearly: next })
                  }}
                />
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </div>
  )
}
