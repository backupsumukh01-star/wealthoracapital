'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { adminQueryKeys } from '@/features/admin/hooks'
import { PermissionGate } from '@/features/auth/guards'
import { ApiError } from '@/lib/api-client'
import {
  adminService,
  type AdminHistoricalImportRecord,
  type AdminUserHistoryActivity,
  type AdminUserHistoryPayload,
} from '@/services/admin.service'

const ACTIVITIES: Array<{ value: AdminUserHistoryActivity; label: string }> = [
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'PROFIT', label: 'Profit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'REFERRAL', label: 'Referral' },
]

function activityLabel(activity: AdminUserHistoryActivity) {
  return ACTIVITIES.find((item) => item.value === activity)?.label ?? activity
}

const selectClassName =
  'h-12 w-full rounded-xl border border-line-default bg-inset/80 px-3.5 text-base text-fg ' +
  'shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] outline-none ' +
  'hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/25'

function summaryNumber(summary: AdminHistoricalImportRecord['summary'], key: string) {
  const value = (summary as Record<string, unknown>)[key]
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '0'
}

export function AdminUserHistoryWorkspace() {
  const params = useParams<{ userId: string }>()
  const userId = params.userId
  const queryClient = useQueryClient()
  const [activity, setActivity] = useState<AdminUserHistoryActivity>('DEPOSIT')
  const [occurredAt, setOccurredAt] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD')
  const [note, setNote] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [preview, setPreview] = useState<AdminHistoricalImportRecord | null>(null)
  const [confirmChecked, setConfirmChecked] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const history = useQuery({
    queryKey: adminQueryKeys.userHistory(userId),
    queryFn: () => adminService.userHistory(userId),
    enabled: Boolean(userId),
  })

  const imports = useQuery({
    queryKey: adminQueryKeys.userHistoryImports(userId),
    queryFn: () => adminService.historyImports(userId),
    enabled: Boolean(userId) && Boolean(history.data?.user.createdByAdminId),
  })

  const save = useMutation({
    mutationFn: () =>
      adminService.createUserHistory(userId, {
        activity,
        occurredAt,
        amount: amount.trim(),
        currency,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(adminQueryKeys.userHistory(userId), data)
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      setAmount('')
      setNote('')
      toast.success('Historical record saved')
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : err.message || 'Could not save record')
    },
  })

  const upload = useMutation({
    mutationFn: (file: File) => adminService.previewHistoryImport(userId, file),
    onSuccess: (data) => {
      setPreview(data)
      setConfirmChecked(false)
      toast.success('File validated. Review the preview before confirming.')
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : err.message || 'Could not validate file')
    },
  })

  const confirmImport = useMutation({
    mutationFn: () => adminService.confirmHistoryImport(userId, preview!.id),
    onSuccess: async (data) => {
      setPreview(data)
      setConfirmChecked(false)
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.userHistory(userId) })
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.userHistoryImports(userId) })
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.success(data.confirmation || 'Historical import completed')
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : err.message || 'Import failed')
    },
  })

  const cancelImport = useMutation({
    mutationFn: () => adminService.cancelHistoryImport(userId, preview!.id),
    onSuccess: async () => {
      setPreview(null)
      setConfirmChecked(false)
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.userHistoryImports(userId) })
      toast.success('Preview cancelled. No financial records were created.')
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : err.message || 'Could not cancel preview')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!occurredAt) {
      toast.error('Enter a historical date and time.')
      return
    }
    if (!amount.trim() || Number(amount) <= 0) {
      toast.error('Enter an amount greater than zero.')
      return
    }
    save.mutate()
  }

  const payload = history.data as AdminUserHistoryPayload | undefined
  const name = payload ? `${payload.user.firstName} ${payload.user.lastName}`.trim() : 'User'
  const wallet = payload?.wallet
  const records = payload?.records ?? []
  const canImport = Boolean(payload?.user.createdByAdminId)
  const previewSummary = preview?.summary
  const invalidRows = preview?.preview?.invalid ?? []
  const skippedRows = (preview?.preview?.rows ?? []).filter((row) => row.outcome === 'SKIPPED')

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Historical data"
        description="Add or change historical deposits, profit, withdrawals, and referrals after the investor exists. No payment gateway or payout is called."
        eyebrow={
          <Link href={ROUTES.admin.user(userId)} className="hover:text-fg">
            ← {name}
          </Link>
        }
      />

      <AdminPanel>
        <div className="space-y-1 p-4 sm:p-5">
          <p className="text-caption text-fg-subtle">Existing investment wallet</p>
          {wallet ? (
            <>
              <p className="text-body-sm text-fg">
                Balance ${wallet.balance} · Available ${wallet.available} · Deposited $
                {wallet.deposited} · Profit ${wallet.profit} · Withdrawn ${wallet.withdrawn}
              </p>
              <p className="text-caption text-fg-muted">Referral wallet ${wallet.referralWallet}</p>
            </>
          ) : (
            <p className="text-body-sm text-fg-muted">Loading wallet…</p>
          )}
        </div>
      </AdminPanel>

      <PermissionGate permission="users.history_import">
        <div id="import">
          {canImport ? (
            <AdminPanel glow>
              <AdminPanelHeader title="Historical Data Import" />
              <div className="space-y-4 p-4 sm:p-5">
                <p className="text-body-sm text-fg-muted">
                  Upload Excel or CSV for {name}. Records always belong to this account. Do not put a
                  User ID in the spreadsheet. Sample Order IDs in the template are never imported.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      adminService.downloadHistoryImportTemplate(userId, 'xlsx').catch((err: Error) =>
                        toast.error(err.message),
                      )
                    }
                  >
                    Download Excel Template
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      adminService.downloadHistoryImportTemplate(userId, 'csv').catch((err: Error) =>
                        toast.error(err.message),
                      )
                    }
                  >
                    Download CSV Template
                  </Button>
                </div>
                <FormField label="Upload File">
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      setUploadName(file?.name ?? '')
                    }}
                  />
                </FormField>
                {uploadName ? (
                  <p className="text-caption text-fg-muted">Selected: {uploadName}</p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  loading={upload.isPending}
                  loadingText="Validating"
                  onClick={() => {
                    const file = fileRef.current?.files?.[0]
                    if (!file) {
                      toast.error('Choose a CSV or Excel file first.')
                      return
                    }
                    upload.mutate(file)
                  }}
                >
                  Preview Import
                </Button>

                {preview ? (
                  <div className="space-y-3 rounded-xl border border-line-default p-4">
                    <p className="text-body-sm font-medium text-fg">Historical Import Preview</p>
                    <p className="text-caption text-fg-muted">
                      File {preview.fileName} · {preview.rowCount} rows detected · status {preview.status}
                    </p>
                    {previewSummary ? (
                      <ul className="grid gap-1 text-caption text-fg sm:grid-cols-2">
                        <li>User: {preview.user.name}</li>
                        <li>Rows: {summaryNumber(previewSummary, 'rows')}</li>
                        <li>
                          Deposits: {summaryNumber(previewSummary, 'deposits')} · $
                          {summaryNumber(previewSummary, 'depositTotal')}
                        </li>
                        <li>
                          Withdrawals: {summaryNumber(previewSummary, 'withdrawals')} · $
                          {summaryNumber(previewSummary, 'withdrawalTotal')}
                        </li>
                        <li>
                          Profit records: {summaryNumber(previewSummary, 'profitRecords')} · $
                          {summaryNumber(previewSummary, 'profitTotal')}
                        </li>
                        <li>
                          Referral records: {summaryNumber(previewSummary, 'referralRecords')} · $
                          {summaryNumber(previewSummary, 'referralTotal')}
                        </li>
                        <li>Valid rows: {summaryNumber(previewSummary, 'validRows')}</li>
                        <li>Skipped rows: {summaryNumber(previewSummary, 'skippedRows')}</li>
                        <li>Invalid rows: {summaryNumber(previewSummary, 'invalidRows')}</li>
                      </ul>
                    ) : null}
                    {invalidRows.length > 0 ? (
                      <div>
                        <p className="text-caption font-medium text-fg">Invalid rows</p>
                        <ul className="mt-1 space-y-1 text-caption text-danger">
                          {invalidRows.map((row) => (
                            <li key={`${row.rowNumber}-${row.reason}`}>
                              Row {row.rowNumber}: {row.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {skippedRows.length > 0 ? (
                      <div>
                        <p className="text-caption font-medium text-fg">Duplicates / skipped</p>
                        <ul className="mt-1 space-y-1 text-caption text-fg-muted">
                          {skippedRows.map((row) => (
                            <li key={`${row.rowNumber}-${row.orderId}`}>
                              Row {row.rowNumber}: {row.skipReason || row.orderId}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {preview.status === 'PREVIEW' ? (
                      <>
                        <label className="flex items-start gap-2 text-caption text-fg">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={confirmChecked}
                            onChange={(e) => setConfirmChecked(e.target.checked)}
                          />
                          <span>
                            You are about to import {preview.validCount} historical records into {name}.
                            This action will create financial history for this user.
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!confirmChecked || preview.invalidCount > 0}
                            loading={confirmImport.isPending}
                            loadingText="Importing"
                            onClick={() => confirmImport.mutate()}
                          >
                            Confirm Import
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            loading={cancelImport.isPending}
                            onClick={() => cancelImport.mutate()}
                          >
                            Cancel preview
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-caption text-fg-muted">
                        Import {preview.importId} is {preview.status.toLowerCase()}.
                      </p>
                    )}
                  </div>
                ) : null}

                <div>
                  <p className="text-caption font-medium text-fg">Import history</p>
                  {(imports.data?.items ?? []).length === 0 ? (
                    <p className="mt-1 text-caption text-fg-muted">No spreadsheet imports yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-white/[0.05]">
                      {(imports.data?.items ?? []).map((item) => (
                        <li key={item.id} className="py-2 text-caption text-fg">
                          <p className="font-medium">
                            Import #{item.importId} · {item.status}
                          </p>
                          <p className="text-fg-muted">
                            {item.fileName} · {new Date(item.createdAt).toLocaleString()} · rows{' '}
                            {item.rowCount} · imported {item.importedCount} · skipped {item.skippedCount}
                            {item.uploadedBy?.name ? ` · by ${item.uploadedBy.name}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </AdminPanel>
          ) : (
            <AdminPanel>
              <div className="p-4 text-body-sm text-fg-muted sm:p-5">
                Spreadsheet import is only available for users created from Admin → Create user.
              </div>
            </AdminPanel>
          )}
        </div>
      </PermissionGate>

      <form onSubmit={handleSubmit}>
        <AdminPanel glow>
          <AdminPanelHeader title="Add historical record" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <FormField label="Activity">
              <select
                className={selectClassName}
                value={activity}
                onChange={(e) => setActivity(e.target.value as AdminUserHistoryActivity)}
              >
                {ACTIVITIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Historical date and time">
              <Input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </FormField>
            <FormField label="Amount">
              <Input
                numeric
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <FormField
              label="Currency"
              hint="Ledger stays in USD. INR is converted with the existing desk rate."
            >
              <select
                className={selectClassName}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'INR')}
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </FormField>
            <FormField label="Note" hint="Optional. Stored with the existing record.">
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
            <div className="flex items-end justify-end">
              <Button type="submit" size="sm" loading={save.isPending} loadingText="Saving">
                Save record
              </Button>
            </div>
          </div>
        </AdminPanel>
      </form>

      <AdminPanel>
        <AdminPanelHeader title="Existing records" />
        {history.isLoading ? (
          <p className="px-4 py-6 text-caption text-fg-muted sm:px-5">Loading records…</p>
        ) : records.length === 0 ? (
          <EmptyState title="No records" description="Saved historical activity will appear here." />
        ) : (
          <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
            {records.map((row) => (
              <li
                key={`${row.activity}-${row.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
              >
                <div>
                  <p className="font-medium text-fg">{activityLabel(row.activity)}</p>
                  <p className="text-fg-muted">
                    {new Date(row.occurredAt).toLocaleString()}
                    {row.reference ? ` · ${row.reference}` : ''}
                    {row.note ? ` · ${row.note}` : ''}
                  </p>
                </div>
                <Money value={row.amount as MoneyString} size="sm" signed={row.activity !== 'WITHDRAWAL'} />
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}
