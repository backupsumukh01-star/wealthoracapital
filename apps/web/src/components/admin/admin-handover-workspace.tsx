'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { adminService } from '@/services/admin.service'
import { usePermission } from '@/providers/session-provider'

const CONFIRM_PHRASE = 'RESET FOR CLIENT HANDOVER'

type HandoverMode = 'TEST_DATA_RESET' | 'FULL_HANDOVER_RESET'

type Preview = Awaited<ReturnType<typeof adminService.handoverPreview>>
type ResetResult = Awaited<ReturnType<typeof adminService.handoverReset>>

function CountRow({ label, value, keep }: { label: string; value: number; keep?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2 last:border-0">
      <span className="text-body-sm text-fg-muted">{label}</span>
      <span
        className={cn(
          'text-body-sm font-medium tabular-nums',
          keep ? 'text-profit' : 'text-fg',
        )}
      >
        {value.toLocaleString()}
      </span>
    </div>
  )
}

/** Admin Client Handover / Production Reset — requires settings.handover. */
export function AdminHandoverWorkspace() {
  const canHandover = usePermission('settings.handover')
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<HandoverMode>('TEST_DATA_RESET')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [phrase, setPhrase] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<ResetResult | null>(null)

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true)
    setResult(null)
    try {
      const data = await adminService.handoverPreview(mode)
      setPreview(data)
    } catch {
      toast.error('Could not load handover preview')
      setPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [mode])

  async function runReset() {
    if (phrase.trim() !== CONFIRM_PHRASE) {
      toast.error(`Type exactly: ${CONFIRM_PHRASE}`)
      return
    }
    setExecuting(true)
    try {
      const data = await adminService.handoverReset({
        mode,
        confirmationPhrase: phrase.trim(),
        confirm: true,
      })
      setResult(data)
      setPhrase('')
      setPreview(null)
      toast.success('Client handover reset completed.')
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Handover reset failed'
      toast.error(message)
    } finally {
      setExecuting(false)
    }
  }

  if (!canHandover) {
    return (
      <Alert tone="danger" title="Permission required">
        Client Handover reset requires the <code>settings.handover</code> permission (Admin / Super
        Admin only).
      </Alert>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPanel>
        <AdminPanelHeader
          title="Client Handover / Production Reset"
          description="Remove test customer and operational financial data before handing the platform to a client. Historical performance is preserved."
        />
        <div className="space-y-4 p-4 sm:p-5">
          <Alert tone="danger" title="Destructive Operation">
            This permanently removes test users and operational financial records. Historical
            Performance / Backtest records will NOT be removed.
          </Alert>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode('TEST_DATA_RESET')
                setPreview(null)
                setResult(null)
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                mode === 'TEST_DATA_RESET'
                  ? 'border-danger/40 bg-danger-bg/40'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20',
              )}
            >
              <p className="text-body-sm font-medium text-fg">Mode A — Test Data Reset</p>
              <p className="mt-1 text-caption text-fg-muted">
                Delete investor/customer operational data. Keep staff, CMS, settings, and historical
                performance.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('FULL_HANDOVER_RESET')
                setPreview(null)
                setResult(null)
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                mode === 'FULL_HANDOVER_RESET'
                  ? 'border-danger/40 bg-danger-bg/40'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20',
              )}
            >
              <p className="text-body-sm font-medium text-fg">Mode B — Full Handover Reset</p>
              <p className="mt-1 text-caption text-fg-muted">
                Same customer wipe plus orphaned ops artefacts. Your authenticated admin/staff
                account is always preserved.
              </p>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void loadPreview()} disabled={loadingPreview}>
              {loadingPreview ? 'Loading preview…' : 'Preview counts'}
            </Button>
          </div>

          {loadingPreview ? <Skeleton className="h-48 rounded-xl" /> : null}

          {preview ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-danger/25 bg-danger-bg/20 p-4">
                <p className="text-caption uppercase tracking-wide text-danger">Will remove</p>
                <div className="mt-2">
                  <CountRow label="Users to remove" value={preview.remove.users} />
                  <CountRow label="Wallets to remove" value={preview.remove.wallets} />
                  <CountRow label="Deposits to remove" value={preview.remove.deposits} />
                  <CountRow label="Withdrawals to remove" value={preview.remove.withdrawals} />
                  <CountRow label="Balance/Ledger records" value={preview.remove.ledgerEntries} />
                  <CountRow label="KYC records to remove" value={preview.remove.kycRecords} />
                  <CountRow label="Support records to remove" value={preview.remove.supportTickets} />
                  <CountRow label="Notifications to remove" value={preview.remove.notifications} />
                  <CountRow
                    label="Other user-generated records"
                    value={preview.remove.otherUserGenerated}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-profit/25 bg-profit/5 p-4">
                <p className="text-caption uppercase tracking-wide text-profit">Will keep</p>
                <div className="mt-2">
                  <CountRow
                    label="Trading days (historical)"
                    value={preview.preserve.historicalDailyReturns}
                    keep
                  />
                  <CountRow label="Historical trades" value={preview.preserve.historicalTrades} keep />
                  <CountRow label="Months" value={preview.preserve.historicalMonths} keep />
                  <CountRow
                    label="Years of performance"
                    value={preview.preserve.yearsOfPerformance}
                    keep
                  />
                  <CountRow label="Staff / admin accounts" value={preview.preserve.staffUsers} keep />
                  <CountRow label="CMS documents" value={preview.preserve.cmsDocuments} keep />
                  <CountRow label="Platform settings" value={preview.preserve.platformSettings} keep />
                  <CountRow label="Payment methods" value={preview.preserve.paymentMethods} keep />
                </div>
                <p className="mt-3 text-caption text-fg-muted">
                  Historical period: approximately {preview.preserve.yearsOfPerformance || '—'} years
                </p>
              </div>
            </div>
          ) : null}

          {preview ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <Alert tone="warning" title="Backup warning">
                A JSON operational snapshot (emails + counts only — no passwords or KYC documents) is
                written under the API upload root before deletion. Prefer an infrastructure DB backup
                before production handover.
              </Alert>

              <FormField label={`Type ${CONFIRM_PHRASE} to unlock reset`}>
                <Input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={CONFIRM_PHRASE}
                />
              </FormField>

              <Button
                type="button"
                variant="danger"
                disabled={executing || phrase.trim() !== CONFIRM_PHRASE}
                onClick={() => setConfirmOpen(true)}
              >
                {executing ? 'Resetting…' : 'Run Client Handover Reset'}
              </Button>
            </div>
          ) : null}

          {result ? (
            <Alert tone="success" title="Client handover reset completed.">
              Historical performance preserved:{' '}
              {result.historicalPerformance.tradingDays.toLocaleString()} trading days ·{' '}
              {result.historicalPerformance.trades.toLocaleString()} trades ·{' '}
              {result.historicalPerformance.months} months
              {result.backupPath ? (
                <>
                  <br />
                  Backup snapshot: {result.backupPath}
                </>
              ) : null}
            </Alert>
          ) : null}
        </div>
      </AdminPanel>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Final confirmation"
        description="This cannot be undone from the admin UI. Historical performance will remain. Continue with the handover reset?"
        confirmLabel="Yes, execute reset"
        danger
        onConfirm={() => {
          void runReset()
        }}
      />
    </div>
  )
}
