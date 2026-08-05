'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ROUTES } from '@meridian/shared'
import type { MoneyString } from '@meridian/shared'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { AdminTradeDirection } from '@/lib/admin-demo-data'

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AUDUSD', 'USDCAD'] as const

export function AdminTradeForm() {
  const router = useRouter()
  const [pair, setPair] = useState<string>('EURUSD')
  const [direction, setDirection] = useState<AdminTradeDirection>('LONG')
  const [entry, setEntry] = useState('')
  const [exit, setExit] = useState('')
  const [profitPct, setProfitPct] = useState('')
  const [notes, setNotes] = useState('')

  const estimatedUsd = (() => {
    const pct = Number.parseFloat(profitPct)
    if (!Number.isFinite(pct)) return null
    return ((2_841_500 * pct) / 100 / 4).toFixed(2) as MoneyString
  })()

  function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!pair || !entry || !exit || !profitPct) {
      toast.error('Fill pair, entry, exit, and profit %')
      return
    }
    toast.success('Trade published', {
      description: `${direction} ${pair} · ${profitPct}%`,
    })
    router.push(ROUTES.admin.trades)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Record a trade"
        description="Enter the position exactly as it was executed. Published trades are visible to every investor."
        eyebrow={
          <Link href={ROUTES.admin.trades} className="hover:text-fg">
            ← Trades
          </Link>
        }
      />

      <form onSubmit={handlePublish} className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <AdminPanel glow>
          <AdminPanelHeader
            title="Position"
            description="Prices are stored at the pair's full precision."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <FormField label="Pair" required>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  {PAIRS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Direction" required>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v as AdminTradeDirection)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">LONG</SelectItem>
                  <SelectItem value="SHORT">SHORT</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Buy / Entry" required>
              <Input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="1.08420"
                inputMode="decimal"
              />
            </FormField>
            <FormField label="Sell / Exit" required>
              <Input
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                placeholder="1.08710"
                inputMode="decimal"
              />
            </FormField>
            <FormField label="Profit %" required className="sm:col-span-2">
              <Input
                value={profitPct}
                onChange={(e) => setProfitPct(e.target.value)}
                placeholder="0.27"
                inputMode="decimal"
              />
            </FormField>
            <FormField label="Notes" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Setup / session notes…"
              />
            </FormField>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel>
            <AdminPanelHeader title="Computed result" />
            <div className="space-y-3 p-4 sm:p-5">
              <div>
                <p className="text-caption text-fg-subtle">Profit %</p>
                <p className="mt-0.5 tabular-nums text-heading-sm text-fg">
                  {profitPct ? `${profitPct}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-caption text-fg-subtle">Est. desk P&amp;L</p>
                <div className="mt-0.5">
                  {estimatedUsd ? <Money value={estimatedUsd} size="md" signed /> : '—'}
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Publication" />
            <div className="space-y-4 p-4 sm:p-5">
              <p className="text-body-sm text-fg-muted">
                Publishing makes this trade visible to all investors immediately. Demo mode does
                not persist.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Publish trade</Button>
                <Button asChild type="button" variant="secondary">
                  <Link href={ROUTES.admin.trades}>Cancel</Link>
                </Button>
              </div>
            </div>
          </AdminPanel>
        </div>
      </form>
    </div>
  )
}
