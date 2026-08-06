'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
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
import { adminService } from '@/services/admin.service'
import { useQueryClient } from '@tanstack/react-query'
import { adminQueryKeys } from '@/features/admin/hooks'

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AUDUSD', 'USDCAD'] as const

export function AdminTradeForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pair, setPair] = useState<string>('EURUSD')
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [entry, setEntry] = useState('')
  const [exit, setExit] = useState('')
  const [profitPct, setProfitPct] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!pair || !entry || !profitPct) {
      toast.error('Fill pair, entry, and return %')
      return
    }
    const entryN = Number.parseFloat(entry)
    const exitN = exit ? Number.parseFloat(exit) : NaN
    const pctN = Number.parseFloat(profitPct)
    if (!Number.isFinite(entryN) || entryN <= 0) {
      toast.error('Entry price must be a positive number')
      return
    }
    if (!Number.isFinite(pctN)) {
      toast.error('Return % must be a number')
      return
    }

    setSaving(true)
    try {
      const trade = await adminService.createTrade({
        pair,
        direction,
        entryPrice: entryN.toFixed(8),
        exitPrice: Number.isFinite(exitN) && exitN > 0 ? exitN.toFixed(8) : undefined,
        returnPct: pctN.toFixed(6),
        tradeDate: new Date().toISOString().slice(0, 10),
        adminNotes: notes.trim() || undefined,
      })
      await adminService.publishTrade(trade.id)
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.trades() })
      toast.success('Trade recorded and published', {
        description: `${direction} ${pair} · ${profitPct}%`,
      })
      router.push(ROUTES.admin.trade(trade.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save trade')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Record a trade"
        description="Enter the position exactly as it was executed. Publishing makes it visible to investors."
        eyebrow={
          <Link href={ROUTES.admin.trades} className="hover:text-fg">
            ← Trades
          </Link>
        }
      />

      <form onSubmit={(e) => void handlePublish(e)} className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
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
                onValueChange={(v) => setDirection(v as 'BUY' | 'SELL')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">BUY / LONG</SelectItem>
                  <SelectItem value="SELL">SELL / SHORT</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Entry" required>
              <Input
                inputMode="decimal"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="1.08520"
              />
            </FormField>
            <FormField label="Exit">
              <Input
                inputMode="decimal"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                placeholder="1.08710"
              />
            </FormField>
            <FormField label="Return %" required>
              <Input
                inputMode="decimal"
                value={profitPct}
                onChange={(e) => setProfitPct(e.target.value)}
                placeholder="0.72"
              />
            </FormField>
            <FormField label="Notes" className="sm:col-span-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Session notes for the desk log"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 border-t border-white/[0.06] px-4 py-4 sm:px-5">
            <Button type="button" variant="ghost" onClick={() => router.push(ROUTES.admin.trades)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save & publish'}
            </Button>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Before you publish" />
          <ul className="space-y-2 p-4 text-caption text-fg-muted sm:p-5">
            <li>Creates a DRAFT trade then publishes it to investors.</li>
            <li>Return % drives desk performance surfaces — use the realized session figure.</li>
            <li>Daily investor profit is settled separately under Daily Return.</li>
          </ul>
        </AdminPanel>
      </form>
    </div>
  )
}
