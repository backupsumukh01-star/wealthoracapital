'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { adminOsId, adminOsNow, type CmsTrade } from '@/lib/admin-os-store'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

const selectClass =
  'h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg'

const emptyTrade = (): CmsTrade => ({
  id: adminOsId('TRD'),
  pair: 'EUR/USD',
  entry: '',
  exit: '',
  direction: 'BUY',
  profitPct: '',
  risk: '0.5%',
  notes: '',
  imageUrl: '',
  status: 'DRAFT',
  scheduledAt: null,
  tradingDay: new Date().toISOString().slice(0, 10),
  createdAt: adminOsNow(),
  publishedAt: null,
})

export function AdminTradeOsWorkspace() {
  const { state, upsertTrade, deleteTrade, setTradeStatus } = useAdminOs()
  const [editing, setEditing] = useState<CmsTrade | null>(null)

  function save(status?: CmsTrade['status']) {
    if (!editing) return
    const next = {
      ...editing,
      status: status ?? editing.status,
      publishedAt:
        (status ?? editing.status) === 'PUBLISHED' ? adminOsNow() : editing.publishedAt,
    }
    upsertTrade(next)
    toast.success(`Trade ${next.status.toLowerCase()}`)
    setEditing(null)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Trade Management"
        description="Draft, schedule, publish, or archive. Published trades feed landing, dashboard, and history."
        actions={
          <Button type="button" onClick={() => setEditing(emptyTrade())}>
            <Plus aria-hidden />
            New trade
          </Button>
        }
      />

      {editing ? (
        <AdminPanel glow>
          <AdminPanelHeader
            title={editing.id.startsWith('TRD_') && !state.trades.find((t) => t.id === editing.id) ? 'New trade' : 'Edit trade'}
            action={
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            }
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <FormField label="Pair">
              <Input value={editing.pair} onChange={(e) => setEditing({ ...editing, pair: e.target.value })} />
            </FormField>
            <FormField label="Direction">
              <select
                className={selectClass}
                value={editing.direction}
                onChange={(e) =>
                  setEditing({ ...editing, direction: e.target.value as CmsTrade['direction'] })
                }
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </FormField>
            <FormField label="Entry">
              <Input value={editing.entry} onChange={(e) => setEditing({ ...editing, entry: e.target.value })} />
            </FormField>
            <FormField label="Exit">
              <Input value={editing.exit} onChange={(e) => setEditing({ ...editing, exit: e.target.value })} />
            </FormField>
            <FormField label="Profit %">
              <Input
                value={editing.profitPct}
                onChange={(e) => setEditing({ ...editing, profitPct: e.target.value })}
              />
            </FormField>
            <FormField label="Risk">
              <Input value={editing.risk} onChange={(e) => setEditing({ ...editing, risk: e.target.value })} />
            </FormField>
            <FormField label="Trading day">
              <Input
                type="date"
                value={editing.tradingDay}
                onChange={(e) => setEditing({ ...editing, tradingDay: e.target.value })}
              />
            </FormField>
            <FormField label="Schedule publish">
              <Input
                type="datetime-local"
                value={editing.scheduledAt?.slice(0, 16) ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    status: e.target.value ? 'SCHEDULED' : editing.status,
                  })
                }
              />
            </FormField>
            <FormField label="Trade image URL" className="sm:col-span-2">
              <Input
                value={editing.imageUrl}
                onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
              />
            </FormField>
            <FormField label="Notes" className="sm:col-span-2">
              <Textarea
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={3}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-4 py-4 sm:px-5">
            <Button type="button" variant="glass" onClick={() => save('DRAFT')}>
              Save draft
            </Button>
            <Button type="button" onClick={() => save('PUBLISHED')}>
              Publish
            </Button>
            <Button type="button" variant="ghost" onClick={() => save('ARCHIVED')}>
              Archive
            </Button>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel>
        <AdminPanelHeader title="Trade library" description={`${state.trades.length} total`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Pair</th>
                <th className="px-4 py-3 font-medium">Dir</th>
                <th className="px-4 py-3 font-medium">P/L %</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.trades.map((t) => (
                <tr key={t.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 sm:px-5">
                    <p className="font-medium text-fg">{t.pair}</p>
                    <p className="font-mono text-[11px] text-fg-muted">{t.id}</p>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{t.direction}</td>
                  <td
                    className={cn(
                      'px-4 py-3 tabular-nums',
                      t.profitPct.startsWith('-') ? 'text-loss' : 'text-profit',
                    )}
                  >
                    {t.profitPct}%
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{t.status}</td>
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(t)}>
                        Edit
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.trade(t.id)}>View</Link>
                      </Button>
                      {t.status !== 'PUBLISHED' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="glass"
                          onClick={() => {
                            setTradeStatus(t.id, 'PUBLISHED')
                            toast.success('Published')
                          }}
                        >
                          Publish
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deleteTrade(t.id)
                          toast.message('Trade deleted')
                        }}
                      >
                        <Trash2 aria-hidden className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
