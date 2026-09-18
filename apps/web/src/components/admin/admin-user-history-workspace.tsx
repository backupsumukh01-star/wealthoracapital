'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
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
import { ApiError } from '@/lib/api-client'
import {
  adminService,
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

export function AdminUserHistoryWorkspace() {
  const params = useParams<{ userId: string }>()
  const userId = params.userId
  const queryClient = useQueryClient()
  const [activity, setActivity] = useState<AdminUserHistoryActivity>('DEPOSIT')
  const [occurredAt, setOccurredAt] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD')
  const [note, setNote] = useState('')

  const history = useQuery({
    queryKey: adminQueryKeys.userHistory(userId),
    queryFn: () => adminService.userHistory(userId),
    enabled: Boolean(userId),
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
  const name = payload
    ? `${payload.user.firstName} ${payload.user.lastName}`.trim()
    : 'User'
  const wallet = payload?.wallet
  const records = payload?.records ?? []

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
