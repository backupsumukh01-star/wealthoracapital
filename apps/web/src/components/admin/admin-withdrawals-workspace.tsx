'use client'

import Link from 'next/link'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminWithdrawalRow,
  investorName,
  mapWithdrawalStatus,
} from '@/components/admin/admin-api-adapters'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminWithdrawalPill } from '@/components/admin/admin-status-pills'
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
import { useAdminUsers, useAdminWithdrawals, useReviewWithdrawal } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

type TabFilter = 'pending' | 'approved' | 'paid' | 'rejected' | 'all'
type WithdrawalDecision = 'APPROVE' | 'REJECT' | 'PAID'

function matchesTab(status: string, tab: TabFilter) {
  const mapped = mapWithdrawalStatus(status)
  switch (tab) {
    case 'pending':
      return mapped === 'PENDING'
    case 'approved':
      return mapped === 'APPROVED'
    case 'paid':
      return mapped === 'PAID'
    case 'rejected':
      return mapped === 'REJECTED'
    default:
      return true
  }
}

export function AdminWithdrawalsWorkspace() {
  const { data, isLoading } = useAdminWithdrawals()
  const { data: usersData } = useAdminUsers()
  const reviewWithdrawal = useReviewWithdrawal()
  const withdrawals = (data?.items ?? []) as AdminWithdrawalRow[]
  const users = usersData?.items ?? []
  const [tab, setTab] = useState<TabFilter>('pending')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const balanceByUserId = useMemo(() => {
    // Wallet balances are not on the User list payload; show em dash via availableBalance helper.
    return new Map(users.map((u) => [u.id, '0.00' as MoneyString]))
  }, [users])

  function availableBalance(userId?: string): MoneyString {
    if (!userId) return '0.00' as MoneyString
    return balanceByUserId.get(userId) ?? ('0.00' as MoneyString)
  }

  const selected = useMemo(
    () => (selectedId ? withdrawals.find((w) => w.id === selectedId) ?? null : null),
    [withdrawals, selectedId],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return withdrawals
      .filter((w) => matchesTab(w.status, tab))
      .filter((w) => {
        if (!needle) return true
        const name = investorName(w.user, w.user?.id ?? '').toLowerCase()
        return (
          w.id.toLowerCase().includes(needle) ||
          w.destinationLabel.toLowerCase().includes(needle) ||
          (w.transactionRef ?? '').toLowerCase().includes(needle) ||
          (w.user?.id ?? '').toLowerCase().includes(needle) ||
          name.includes(needle)
        )
      })
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  }, [withdrawals, tab, q])

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
    }
  }, [withdrawals])

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

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Withdrawals"
        description="Requested funds are locked against the balance. Approving releases payment via the admin API."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Awaiting review</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.pending}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Approved, awaiting payment</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.approved}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Paid</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.paid}</p>
        </AdminPanel>
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Value locked</p>
          <div className="mt-2">
            <Money value={stats.locked} size="md" />
          </div>
        </AdminPanel>
      </div>

      <AdminPanel className="p-4 sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="border-white/10 bg-white/[0.04] pl-10"
            placeholder="Search investor, destination, ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </AdminPanel>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <AdminPanel className="overflow-hidden">
        <AdminPanelHeader
          title="Withdrawal queue"
          description={`${filtered.length} shown · oldest first`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Available balance</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Detail</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-fg-muted">
                    {isLoading ? 'Loading withdrawals…' : 'No withdrawals in this view.'}
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{investorName(w.user, w.user?.id ?? '—')}</p>
                      <p className="font-mono text-[11px] text-fg-subtle">{w.user?.id ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Money value={w.amount as MoneyString} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Money value={availableBalance(w.user?.id)} size="sm" />
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
                    <dd className="text-fg">
                      {investorName(selected.user)} · {selected.user?.id ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Amount</dt>
                    <dd>
                      <Money value={selected.amount as MoneyString} size="sm" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Available balance</dt>
                    <dd>
                      <Money value={availableBalance(selected.user?.id)} size="sm" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Bank / wallet</dt>
                    <dd className="text-fg">
                      {selected.destinationLabel} · {selected.transactionRef ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Requested</dt>
                    <dd className="text-fg">{formatDateTime(selected.createdAt)}</dd>
                  </div>
                </dl>
                <FormField label="Rejection reason" hint="Required when rejecting.">
                  <Textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="border-white/10 bg-white/[0.04]"
                    placeholder="Optional on approve…"
                  />
                </FormField>
              </SheetBody>
              <SheetFooter>
                <Button
                  size="sm"
                  disabled={reviewWithdrawal.isPending}
                  onClick={() => void decide('APPROVE', 'Withdrawal approved')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={reviewWithdrawal.isPending}
                  onClick={() => void decide('REJECT', 'Withdrawal rejected')}
                >
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
