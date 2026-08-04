'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { adminOsId, type TickerPair } from '@/lib/admin-os-store'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminTickerWorkspace() {
  const { state, upsertTicker, removeTicker, reorderTicker, updateTickerDisplay } = useAdminOs()
  const display = state.tickerDisplay
  const sorted = useMemo(
    () => [...state.ticker].sort((a, b) => a.order - b.order),
    [state.ticker],
  )
  const [draft, setDraft] = useState({
    pair: '',
    price: '',
    change: '0.00',
    tone: 'auto' as TickerPair['tone'],
  })
  const [removeId, setRemoveId] = useState<string | null>(null)

  function move(id: string, dir: -1 | 1) {
    const ids = sorted.map((t) => t.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
    reorderTicker(ids)
  }

  function addPair() {
    if (!draft.pair.trim()) return
    const pair: TickerPair = {
      id: adminOsId('TK'),
      pair: draft.pair.trim().toUpperCase(),
      price: draft.price || '0.00',
      change: draft.change || '0.00',
      enabled: true,
      featured: false,
      order: sorted.length,
      tone: draft.tone,
    }
    upsertTicker(pair)
    setDraft({ pair: '', price: '', change: '0.00', tone: 'auto' })
    toast.success('Pair added — landing ticker updates live')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Live Market Ticker"
        description="Control pairs, colours, scroll speed, and refresh — homepage tape updates automatically."
      />

      <AdminPanel>
        <AdminPanelHeader title="Tape display" description="Global ticker behaviour on marketing pages." />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
          <label className="flex items-center gap-2 text-caption text-fg-muted sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              checked={display.enabled}
              onChange={(e) => {
                updateTickerDisplay({ enabled: e.target.checked })
                toast.message(e.target.checked ? 'Ticker enabled' : 'Ticker disabled')
              }}
            />
            Enable live market ticker
          </label>
          <FormField label="Auto-scroll speed (sec)">
            <Input
              type="number"
              min={8}
              max={120}
              value={display.scrollSpeed}
              onChange={(e) => updateTickerDisplay({ scrollSpeed: Number(e.target.value) || 40 })}
            />
          </FormField>
          <FormField label="Refresh rate (ms)">
            <Input
              type="number"
              min={1000}
              step={500}
              value={display.refreshMs}
              onChange={(e) => updateTickerDisplay({ refreshMs: Number(e.target.value) || 8000 })}
            />
          </FormField>
          <FormField label="Scroll direction">
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg"
              value={display.direction}
              onChange={(e) =>
                updateTickerDisplay({ direction: e.target.value as 'left' | 'right' })
              }
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </FormField>
          <FormField label="Up / green colour">
            <Input
              type="color"
              value={display.upColor}
              onChange={(e) => updateTickerDisplay({ upColor: e.target.value })}
            />
          </FormField>
          <FormField label="Down / red colour">
            <Input
              type="color"
              value={display.downColor}
              onChange={(e) => updateTickerDisplay({ downColor: e.target.value })}
            />
          </FormField>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Add pair" />
        <div className="grid gap-3 p-4 sm:grid-cols-5 sm:p-5">
          <FormField label="Pair">
            <Input
              placeholder="EUR/USD"
              value={draft.pair}
              onChange={(e) => setDraft((d) => ({ ...d, pair: e.target.value }))}
            />
          </FormField>
          <FormField label="Price">
            <Input
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            />
          </FormField>
          <FormField label="Change %">
            <Input
              value={draft.change}
              onChange={(e) => setDraft((d) => ({ ...d, change: e.target.value }))}
            />
          </FormField>
          <FormField label="Tone">
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg"
              value={draft.tone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, tone: e.target.value as TickerPair['tone'] }))
              }
            >
              <option value="auto">Auto</option>
              <option value="up">Green</option>
              <option value="down">Red</option>
            </select>
          </FormField>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={addPair}>
              <Plus aria-hidden />
              Add
            </Button>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Pairs" description={`${sorted.length} configured`} />
        <ul className="divide-y divide-white/[0.04]">
          {sorted.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {t.pair}{' '}
                  {t.featured ? (
                    <Star className="ml-1 inline size-3.5 text-amber-300" aria-label="Featured" />
                  ) : null}
                </p>
                <p className="text-caption tabular-nums text-fg-muted">
                  {t.price} · {t.change}% · tone {t.tone ?? 'auto'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => move(t.id, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(t.id, 1)}>
                  <ArrowDown aria-hidden />
                </Button>
                <select
                  className="h-8 rounded-lg border border-white/10 bg-inset/60 px-2 text-caption text-fg"
                  value={t.tone ?? 'auto'}
                  onChange={(e) => {
                    upsertTicker({ ...t, tone: e.target.value as TickerPair['tone'] })
                    toast.message('Tone updated')
                  }}
                >
                  <option value="auto">Auto</option>
                  <option value="up">Green</option>
                  <option value="down">Red</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    const price = window.prompt('Update price', t.price)
                    if (price == null) return
                    upsertTicker({ ...t, price })
                    toast.success('Price updated')
                  }}
                >
                  Price
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    const change = window.prompt('Update % change', t.change)
                    if (change == null) return
                    upsertTicker({ ...t, change })
                    toast.success('% updated')
                  }}
                >
                  %
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => upsertTicker({ ...t, featured: !t.featured })}
                >
                  {t.featured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  className={cn(!t.enabled && 'opacity-60')}
                  onClick={() => {
                    upsertTicker({ ...t, enabled: !t.enabled })
                    toast.message(t.enabled ? 'Pair disabled' : 'Pair enabled')
                  }}
                >
                  {t.enabled ? 'Enabled' : 'Disabled'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setRemoveId(t.id)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <ConfirmActionDialog
        open={Boolean(removeId)}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title="Delete pair?"
        description="This removes the pair from the live marketing ticker immediately."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!removeId) return
          removeTicker(removeId)
          toast.success('Pair removed')
          setRemoveId(null)
        }}
      />
    </div>
  )
}
