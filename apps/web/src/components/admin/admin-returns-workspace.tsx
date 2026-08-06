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
  usePublishReturn,
} from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function formatDuration(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function AdminReturnsWorkspace() {
  const tradingDay = todayIsoDate()
  const confirmPhrase = `APPLY-${tradingDay}`
  const { data: returnsData, isLoading } = useAdminReturns()
  const publishReturn = usePublishReturn()
  const [returnPct, setReturnPct] = useState('0.00')
  const [notes, setNotes] = useState('')
  const [previewed, setPreviewed] = useState(false)
  const [previewSummary, setPreviewSummary] = useState<{
    eligibleWallets: number
    totalBaseAmount: string
    totalDistributed: string
  } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const returns = returnsData?.items ?? []

  const todayPublished = useMemo(
    () =>
      returns.find(
        (r) => r.date === tradingDay && (r.status === 'COMPLETED' || r.status === 'PROCESSING'),
      ) ?? null,
    [returns, tradingDay],
  )

  const history = useMemo(
    () =>
      [...returns]
        .map((r) => ({
          id: r.id,
          tradingDay: r.date,
          returnPct: r.returnPct,
          notes: r.notes ?? '',
          status: r.status,
          eligibleWallets: r.eligibleWallets,
          successful: r.successfulWallets ?? r.processedWallets,
          failed: r.failedWallets ?? 0,
          distributed: r.totalDistributed as MoneyString,
          appliedBy: r.appliedBy ?? null,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          durationMs: r.durationMs ?? null,
        }))
        .sort((a, b) => +new Date(b.tradingDay) - +new Date(a.tradingDay)),
    [returns],
  )

  async function handlePreview() {
    if (!returnPct.trim() || Number.isNaN(Number.parseFloat(returnPct))) {
      toast.error('Enter a valid return %')
      return
    }
    if (todayPublished?.status === 'COMPLETED') {
      toast.error("Today's return has already been published.")
      return
    }
    try {
      const preview = await publishReturn.mutateAsync({
        date: tradingDay,
        returnPct,
        idempotencyKey: `preview-${tradingDay}-${crypto.randomUUID()}`,
        preview: true,
      })
      setPreviewSummary({
        eligibleWallets: preview.eligibleWallets,
        totalBaseAmount: preview.totalBaseAmount,
        totalDistributed: preview.totalDistributed,
      })
      setPreviewed(true)
      toast.success('Preview ready', {
        description: `${preview.eligibleWallets.toLocaleString()} wallets · $${preview.totalDistributed} estimated`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Preview failed')
    }
  }

  async function handlePublish() {
    if (todayPublished?.status === 'COMPLETED') {
      toast.error("Today's return has already been published.")
      return
    }
    if (confirmText !== confirmPhrase) {
      toast.error(`Type ${confirmPhrase} to confirm`)
      return
    }
    try {
      const run = await publishReturn.mutateAsync({
        date: tradingDay,
        returnPct,
        notes: notes.trim() || undefined,
      })
      setConfirmOpen(false)
      setConfirmText('')
      setPreviewed(false)
      setPreviewSummary(null)
      toast.success('Daily return published', {
        description: `+${returnPct}% · $${run.totalDistributed} to ${run.successfulWallets ?? run.processedWallets} wallets`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish return')
    }
  }

  const publishDisabled =
    !previewed ||
    publishReturn.isPending ||
    todayPublished?.status === 'COMPLETED'

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Daily return"
        description="Set today's figure, preview the exact effect on every balance, then apply it once."
      />

      {todayPublished?.status === 'COMPLETED' ? (
        <Alert tone="warning" title="Today's return has already been published">
          A completed settlement exists for {tradingDay}. Publish is disabled to prevent duplicate
          credits. Open the run below for details.
        </Alert>
      ) : (
        <Alert tone="danger" title="This affects every investor balance">
          Preview before applying. Each wallet is credited in its own transaction — successes are
          kept even if another wallet fails. A trading day can only be settled once.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Trading day" value={tradingDay} />
        <StatCard
          label="Eligible wallets"
          value={String(previewSummary?.eligibleWallets ?? '—')}
        />
        <StatCard
          label="AUM base"
          value={
            previewSummary ? (
              <Money value={previewSummary.totalBaseAmount as MoneyString} size="sm" />
            ) : (
              '—'
            )
          }
        />
        <StatCard
          label="Run state"
          value={
            todayPublished?.status === 'COMPLETED'
              ? 'Published'
              : previewed
                ? 'Previewed'
                : 'Draft'
          }
        />
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
                  setPreviewSummary(null)
                }}
                placeholder="0.72"
                disabled={todayPublished?.status === 'COMPLETED'}
              />
            </FormField>
            <FormField label="Notes" hint="Visible on the settlement run record.">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Session summary…"
                disabled={todayPublished?.status === 'COMPLETED'}
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handlePreview()}
                disabled={todayPublished?.status === 'COMPLETED' || publishReturn.isPending}
              >
                Preview
              </Button>
              <Button
                type="button"
                disabled={publishDisabled}
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
            description="Server-computed impact — nothing written until you publish."
          />
          <div className="space-y-4 p-4 sm:p-5">
            {previewed && previewSummary ? (
              <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-fg-subtle">Eligible wallets</dt>
                  <dd className="mt-0.5 tabular-nums text-fg">
                    {previewSummary.eligibleWallets.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Return</dt>
                  <dd className="mt-0.5 tabular-nums text-profit">+{returnPct}%</dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Investment base</dt>
                  <dd className="mt-0.5">
                    <Money value={previewSummary.totalBaseAmount as MoneyString} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Distributed (exact)</dt>
                  <dd className="mt-0.5">
                    <Money value={previewSummary.totalDistributed as MoneyString} size="sm" />
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption text-fg-subtle">Notes</dt>
                  <dd className="mt-0.5 text-fg-muted">{notes.trim() || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-body-sm text-fg-muted">
                Run Preview to see eligible wallets and the exact distribution from the database.
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
          <table className="w-full min-w-[1100px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Trading day</th>
                <th className="px-4 py-3 font-medium">Return</th>
                <th className="px-4 py-3 font-medium">Processed</th>
                <th className="px-4 py-3 font-medium">Successful</th>
                <th className="px-4 py-3 font-medium">Failed</th>
                <th className="px-4 py-3 font-medium">Distributed</th>
                <th className="px-4 py-3 font-medium">Applied by</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-fg-muted sm:px-5">
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
                    <td className="px-4 py-3 tabular-nums text-fg">{run.successful}</td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">{run.failed}</td>
                    <td className="px-4 py-3">
                      <Money value={run.distributed} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{run.appliedBy ?? '—'}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {run.startedAt ? formatDateTime(run.startedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {run.completedAt ? formatDateTime(run.completedAt) : run.status}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">
                      {formatDuration(run.durationMs)}
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
              to {previewSummary?.eligibleWallets.toLocaleString() ?? '—'} wallets (
              {previewSummary ? (
                <>
                  ~$
                  {previewSummary.totalDistributed}
                </>
              ) : (
                'exact amount from preview'
              )}
              ).
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
