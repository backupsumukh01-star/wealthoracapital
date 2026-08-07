'use client'

import Link from 'next/link'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminWithdrawalRow,
  investorName,
  mapWithdrawalStatus,
} from '@/components/admin/admin-api-adapters'
import { AdminListPagination } from '@/components/admin/admin-list-pagination'
import { AdminPanel } from '@/components/admin/admin-panel'
import { AdminWithdrawalPill } from '@/components/admin/admin-status-pills'
import { DualMoney } from '@/components/common/dual-money'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAdminWithdrawals, useReviewWithdrawal } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

type TabFilter = 'pending' | 'approved' | 'paid' | 'rejected' | 'all'
type WithdrawalDecision = 'APPROVE' | 'REJECT' | 'PAID'

function statusForTab(tab: TabFilter): string | undefined {
  switch (tab) {
    case 'pending':
      return 'PENDING'
    case 'approved':
      return 'APPROVED'
    case 'paid':
      return 'PAID'
    case 'rejected':
      return 'REJECTED'
    default:
      return undefined
  }
}

export function AdminWithdrawalsWorkspace() {
  const [tab, setTab] = useState<TabFilter>('pending')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [q])

  const { data, isLoading } = useAdminWithdrawals({
    status: statusForTab(tab),
    q: debouncedQ.length >= 2 ? debouncedQ : undefined,
    page,
    limit: 20,
  })
  const reviewWithdrawal = useReviewWithdrawal()
  const withdrawals = useMemo(
    () => (data?.items ?? []) as AdminWithdrawalRow[],
    [data?.items],
  )
  const pagination = data?.pagination

  const selected = useMemo(
    () => (selectedId ? withdrawals.find((w) => w.id === selectedId) ?? null : null),
    [withdrawals, selectedId],
  )

  const stats = useMemo(() => {
    const pending = withdrawals.filter((w) => mapWithdrawalStatus(w.status) === 'PENDING')
    const approved = withdrawals.filter((w) => mapWithdrawalStatus(w.status) === 'APPROVED').length
    const paid = withdrawals.filter((w) => mapWithdrawalStatus(w.status) === 'PAID').length
    const locked = pending.reduce((sum, w) => sum + Number(w.amount), 0)
    return {
      pending: pending.length,
      approved,
      paid,
      locked: locked.toFixed(2) as MoneyString,
      pageTotal: pagination?.total,
    }
  }, [withdrawals, pagination?.total])

  async function decide(decision: WithdrawalDecision, title: string) {
    if (!selected) return
    if (decision === 'REJECT' && !reason.trim()) {
      toast.error('Reason required to reject')
      return
    }
    try {
      await reviewWithdrawal.mutateAsync({
        id: selected.id,
        decision,
        reason: reason.trim() || undefined,
      })
      toast.success(title, { description: reason.trim() || selected.id })
      setSelectedId(null)
      setReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    }
  }

  function openReview(w: AdminWithdrawalRow) {
    setSelectedId(w.id)
    setReason('')
  }

  function availableOf(w: AdminWithdrawalRow | null | undefined): MoneyString {
    return (w?.availableBalance ?? w?.walletBalance ?? '0.00') as MoneyString
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Withdrawals"
        description="Review payout requests against live available balances before approving."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Pending (page)</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.pending}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Approved (page)</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.approved}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Paid (page)</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.paid}</p>
        </AdminPanel>
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Locked (page)</p>
          <p className="mt-2 text-stat-md text-fg">
            {isLoading ? '—' : <Money value={stats.locked} size="md" />}
          </p>
        </AdminPanel>
      </div>

      <AdminPanel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as TabFilter)
              setPage(1)
            }}
          >
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="border-white/10 bg-white/[0.04] pl-10"
              placeholder="Search reference, user…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Detail</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-fg-muted">
                    {isLoading ? 'Loading withdrawals…' : 'No withdrawals in this view.'}
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{investorName(w.user, w.user?.id ?? '—')}</p>
                      <p className="font-mono text-[11px] text-fg-subtle">{w.user?.id ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <DualMoney
                        usd={w.amount as MoneyString}
                        inr={(w.amountInr ?? w.withdrawInr) as MoneyString | null | undefined}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Money value={availableOf(w)} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{w.destinationLabel}</td>
                    <td className="px-4 py-3 text-fg-muted">{w.transactionRef ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {formatDateTime(w.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminWithdrawalPill status={mapWithdrawalStatus(w.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {mapWithdrawalStatus(w.status) === 'PENDING' ? (
                          <Button size="sm" variant="ghost" onClick={() => openReview(w)}>
                            Review
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="ghost">
                          <Link href={ROUTES.admin.withdrawal(w.id)}>Open</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminListPagination pagination={pagination} onPageChange={setPage} />
      </AdminPanel>

      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
            setReason('')
          }
        }}
      >
        <SheetContent side="right" className="w-[min(92vw,28rem)] max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>Withdrawal review</SheetTitle>
                <SheetDescription>{selected.id}</SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <dl className="grid gap-3 text-caption">
                  <div>
                    <dt className="text-fg-subtle">Investor</dt>
                    <dd className="mt-0.5 text-fg">
                      {investorName(selected.user, selected.user?.id ?? '—')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Amount</dt>
                    <dd className="mt-0.5">
                      <DualMoney
                        usd={selected.amount as MoneyString}
                        inr={(selected.amountInr ?? selected.withdrawInr) as MoneyString | null | undefined}
                        size="sm"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Available balance</dt>
                    <dd className="mt-0.5">
                      <Money value={availableOf(selected)} size="sm" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Destination</dt>
                    <dd className="mt-0.5 text-fg">{selected.destinationLabel}</dd>
                  </div>
                </dl>
                <FormField label="Reason (required to reject)">
                  <Textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="border-white/10 bg-white/[0.04]"
                  />
                </FormField>
              </SheetBody>
              <SheetFooter className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void decide('APPROVE', 'Withdrawal approved')}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void decide('PAID', 'Marked paid')}>
                  Mark paid
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void decide('REJECT', 'Withdrawal rejected')}>
                  Reject
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
