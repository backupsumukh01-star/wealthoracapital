'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { usePermission } from '@/providers/session-provider'
import {
  adminService,
  type AdminHandoverMode,
  type AdminHandoverPreview,
  type AdminHandoverResetResult,
} from '@/services/admin.service'

const CONFIRM_PHRASE = 'RESET'

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
  const [mode, setMode] = useState<AdminHandoverMode>('TEST_DATA_RESET')
  const [preview, setPreview] = useState<AdminHandoverPreview | null>(null)
  const [phrase, setPhrase] = useState('')
  const [backupAcknowledged, setBackupAcknowledged] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<AdminHandoverResetResult | null>(null)

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
    if (!backupAcknowledged) {
      toast.error('A database backup acknowledgement is required.')
      return
    }
    setExecuting(true)
    try {
      const data = await adminService.handoverReset({
        mode,
        confirmationPhrase: phrase.trim(),
        confirm: true,
        backupAcknowledged: true,
      })
      setResult(data)
      setPhrase('')
      setBackupAcknowledged(false)
      setPreview(null)
      if (data.alreadyClean) {
        toast.info(data.message)
      } else {
        toast.success('Client handover reset completed.')
      }
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Handover reset failed'
      toast.error(message)
    } finally {
      setExecuting(false)
    }
  }

  function selectMode(nextMode: AdminHandoverMode) {
    setMode(nextMode)
    setPreview(null)
    setResult(null)
    setPhrase('')
    setBackupAcknowledged(false)
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
          description="Remove customer/demo operational data before handing the platform to a client. Historical performance is preserved."
        />
        <div className="space-y-4 p-4 sm:p-5">
          <Alert tone="danger" title="Destructive Operation">
            This permanently removes customer/demo accounts and their operational financial data.
            Historical platform data, CMS content, settings, payment methods, and staff accounts are
            preserved.
          </Alert>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => selectMode('TEST_DATA_RESET')}
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
              onClick={() => selectMode('FULL_HANDOVER_RESET')}
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

          <div className="space-y-2">
            <p className="text-caption uppercase tracking-wide text-fg-muted">Preview Reset</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadPreview()}
                disabled={loadingPreview}
              >
                {loadingPreview ? 'Loading preview…' : 'Preview Reset'}
              </Button>
            </div>
          </div>

          {preview?.alreadyClean ? (
            <Alert tone="info" title="No customer/demo data remains.">
              Historical platform data and configuration are preserved. Running the reset again will
              return the already-clean result without deleting preserved data.
            </Alert>
          ) : null}

          {loadingPreview ? <Skeleton className="h-48 rounded-xl" /> : null}

          {preview ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-danger/25 bg-danger-bg/20 p-4">
                <p className="text-caption uppercase tracking-wide text-danger">Will remove</p>
                <div className="mt-2">
                  <CountRow label="Users to remove" value={preview.remove.users} />
                  <CountRow label="Wallets to remove" value={preview.remove.wallets} />
                  <CountRow label="Non-zero wallet balances" value={preview.remove.balances} />
                  <CountRow label="Deposits to remove" value={preview.remove.deposits} />
                  <CountRow label="Withdrawals to remove" value={preview.remove.withdrawals} />
                  <CountRow label="Transactions to remove" value={preview.remove.transactions} />
                  <CountRow label="Ledger entries to remove" value={preview.remove.ledgerEntries} />
                  <CountRow label="KYC records to remove" value={preview.remove.kycRecords} />
                  <CountRow label="Support tickets to remove" value={preview.remove.supportTickets} />
                  <CountRow label="Notifications to remove" value={preview.remove.notifications} />
                  <CountRow label="Sessions to remove" value={preview.remove.sessions} />
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
                  Historical period: {preview.preserve.historicalPeriodLabel}
                </p>
              </div>
            </div>
          ) : null}

          {preview ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-caption uppercase tracking-wide text-fg-muted">Reset Client Data</p>
              <Alert tone="warning" title="Backup acknowledgement required">
                A JSON operational snapshot with emails and counts only is written before deletion. This
                does not verify that an infrastructure backup exists.
              </Alert>

              <CheckboxField
                checked={backupAcknowledged}
                onCheckedChange={(checked) => setBackupAcknowledged(checked === true)}
                label="I confirm a database backup exists"
                hint="This acknowledgement is required before the reset can be run."
              />

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
                disabled={executing || !backupAcknowledged || phrase.trim() !== CONFIRM_PHRASE}
                onClick={() => setConfirmOpen(true)}
              >
                {executing ? 'Resetting…' : 'Reset Client Data'}
              </Button>
            </div>
          ) : null}

          {result ? (
            <Alert
              tone={result.alreadyClean ? 'info' : 'success'}
              title={result.alreadyClean ? 'Reset not needed.' : 'Client handover reset completed.'}
            >
              {result.message}
              <br />
              Historical performance preserved: {result.historicalPerformance.tradingDays.toLocaleString()}{' '}
              trading days, {result.historicalPerformance.trades.toLocaleString()} trades,{' '}
              {result.historicalPerformance.periodLabel}.
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
        description="This permanently removes customer/demo data and cannot be undone from the admin UI. Historical platform data will remain. Continue?"
        confirmLabel="Reset Client Data"
        danger
        onConfirm={() => {
          void runReset()
        }}
      />
    </div>
  )
}
