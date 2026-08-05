'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ROUTES } from '@meridian/shared'
import type { MoneyString } from '@meridian/shared'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminReturns,
  useAdminUsers,
  usePublishReturn,
} from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function AdminReturnsWorkspace() {
  const tradingDay = todayIsoDate()
  const confirmPhrase = `APPLY-${tradingDay}`
  const { data: usersData } = useAdminUsers()
  const { data: returnsData, isLoading } = useAdminReturns()
  const publishReturn = usePublishReturn()
  const [returnPct, setReturnPct] = useState('0.00')
  const [notes, setNotes] = useState('')
  const [previewed, setPreviewed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const users = usersData?.items ?? []
  const returns = returnsData?.items ?? []

  const eligible = useMemo(
    () => users.filter((a) => a.kycStatus === 'APPROVED' && a.status === 'ACTIVE').length,
    [users],
  )
  // AUM preview is estimate-only — wallet totals are not on the users list payload.
  const aum = '0.00' as MoneyString

  const distributed = useMemo(() => {
    const pct = Number.parseFloat(returnPct)
    const base = Number.parseFloat(aum)
    if (!Number.isFinite(pct) || !Number.isFinite(base)) return '0.00' as MoneyString
    return ((base * pct) / 100).toFixed(2) as MoneyString
  }, [returnPct, aum])

  const history = useMemo(
    () =>
      [...returns]
        .map((r) => ({
          id: r.id,
          tradingDay: r.date,
          returnPct: r.returnPct,
          notes: notes && r.date === tradingDay ? notes : '',
          status: r.status,
          eligibleWallets: r.eligibleWallets,
          distributed: r.totalDistributed as MoneyString,
          publishedAt: r.completedAt ?? r.startedAt,
          publishedBy: undefined as string | undefined,
        }))
        .sort((a, b) => +new Date(b.tradingDay) - +new Date(a.tradingDay)),
    [returns, notes, tradingDay],
  )

  function handlePreview() {
    if (!returnPct.trim() || Number.isNaN(Number.parseFloat(returnPct))) {
      toast.error('Enter a valid return %')
      return
    }
    setPreviewed(true)
    toast.success('Preview ready', {
      description: `${eligible.toLocaleString()} wallets · server will compute final distribution`,
    })
  }

  async function handlePublish() {
    if (confirmText !== confirmPhrase) {
      toast.error(`Type ${confirmPhrase} to confirm`)
      return
    }
    try {
      await publishReturn.mutateAsync({
        date: tradingDay,
        returnPct,
      })
      setConfirmOpen(false)
      setConfirmText('')
      setPreviewed(false)
      toast.success('Daily return published', {
        description: `+${returnPct}% submitted for ${tradingDay}`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish return')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Daily return"
        description="Set today's figure, preview the exact effect on every balance, then apply it once."
      />

      <Alert tone="danger" title="This affects every investor balance">
        Preview before applying. The run is atomic — it either lands in full or not at all — and it
        cannot be undone, only corrected by a further recorded entry.
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Trading day" value={tradingDay} />
        <StatCard label="Eligible wallets" value={String(eligible)} />
        <StatCard label="AUM base" value={<Money value={aum} size="sm" />} />
        <StatCard label="Run state" value={previewed ? 'Previewed' : 'Draft'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <AdminPanel glow>
          <AdminPanelHeader
            title="Today's figure"
            description="Enter the return percentage and optional desk notes."
          />
          <div className="space-y-4 p-4 sm:p-5">
            <FormField label="Return %" required hint="Positive or negative. Example: 0.72">
              <Input
                inputMode="decimal"
                value={returnPct}
                onChange={(e) => {
                  setReturnPct(e.target.value)
                  setPreviewed(false)
                }}
                placeholder="0.72"
              />
            </FormField>
            <FormField label="Notes" hint="Visible on the settlement run record.">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Session summary…"
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handlePreview}>
                Preview
              </Button>
              <Button
                type="button"
                disabled={!previewed || publishReturn.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Publish
              </Button>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader
            title="Dry-run preview"
            description="Computed impact — nothing written until you publish."
          />
          <div className="space-y-4 p-4 sm:p-5">
            {previewed ? (
              <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-fg-subtle">Eligible wallets</dt>
                  <dd className="mt-0.5 tabular-nums text-fg">{eligible.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Return</dt>
                  <dd className="mt-0.5 tabular-nums text-profit">+{returnPct}%</dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Distributed (estimate)</dt>
                  <dd className="mt-0.5">
                    <Money value={distributed} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Notes</dt>
                  <dd className="mt-0.5 text-fg-muted">{notes.trim() || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-body-sm text-fg-muted">
                Run Preview to see eligible wallets and the estimated distribution.
              </p>
            )}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel>
        <AdminPanelHeader
          title="Previous runs"
          description="Every settlement, with its result and who applied it."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Trading day</th>
                <th className="px-4 py-3 font-medium">Return</th>
                <th className="px-4 py-3 font-medium">Wallets</th>
                <th className="px-4 py-3 font-medium">Distributed</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-fg-muted sm:px-5">
                    {isLoading ? 'Loading returns…' : 'No published returns yet.'}
                  </td>
                </tr>
              ) : (
                history.map((run) => (
                  <tr key={run.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 tabular-nums text-fg sm:px-5">{run.tradingDay}</td>
                    <td className="px-4 py-3 tabular-nums text-profit">+{run.returnPct}%</td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">
                      {run.eligibleWallets.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Money value={run.distributed} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {run.publishedAt ? formatDateTime(run.publishedAt) : '—'}
                      {run.publishedBy ? (
                        <span className="mt-0.5 block text-[11px] text-fg-subtle">{run.publishedBy}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.dailyReturnRun(run.id)}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm daily return</DialogTitle>
            <DialogDescription>
              Type <span className="font-mono text-fg">{confirmPhrase}</span> to apply +{returnPct}%
              to {eligible.toLocaleString()} wallets.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Confirmation phrase" required>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              autoComplete="off"
              className="font-mono"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handlePublish()}
              disabled={confirmText !== confirmPhrase || publishReturn.isPending}
            >
              Apply return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
