'use client'

import Link from 'next/link'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import type { MoneyWithdrawal, MoneyWithdrawalStatus } from '@/lib/investor-lifecycle'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

type TabFilter = 'pending' | 'approved' | 'paid' | 'rejected' | 'all'

function matchesTab(status: MoneyWithdrawalStatus, tab: TabFilter) {
  switch (tab) {
    case 'pending':
      return status === 'PENDING'
    case 'approved':
      return status === 'APPROVED'
    case 'paid':
      return status === 'PAID'
    case 'rejected':
      return status === 'REJECTED'
    default:
      return true
  }
}

export function AdminWithdrawalsWorkspace() {
  const { withdrawals, accounts, approveWithdrawal, rejectWithdrawal } = useInvestorLifecycle()
  const [tab, setTab] = useState<TabFilter>('pending')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const accountByUserId = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.userId, a]))
    return map
  }, [accounts])

  function investorName(userId: string) {
    const a = accountByUserId.get(userId)
    return a ? `${a.firstName} ${a.lastName}` : userId
  }

  function availableBalance(userId: string): MoneyString {
    return (accountByUserId.get(userId)?.wallet.availableBalance ?? '0.00') as MoneyString
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
        const a = accountByUserId.get(w.userId)
        const name = a ? `${a.firstName} ${a.lastName}`.toLowerCase() : w.userId.toLowerCase()
        return (
          w.id.toLowerCase().includes(needle) ||
          w.destination.toLowerCase().includes(needle) ||
          w.destinationDetail.toLowerCase().includes(needle) ||
          w.userId.toLowerCase().includes(needle) ||
          name.includes(needle)
        )
      })
      .sort((a, b) => +new Date(a.requestedAt) - +new Date(b.requestedAt))
  }, [withdrawals, tab, q, accountByUserId])

  const stats = useMemo(() => {
    const pending = withdrawals.filter((w) => w.status === 'PENDING')
    const approved = withdrawals.filter((w) => w.status === 'APPROVED').length
    const paid = withdrawals.filter((w) => w.status === 'PAID').length
    const locked = pending.reduce((sum, w) => sum + Number(w.amount), 0)
    return {
      pending: pending.length,
      approved,
      paid,
      locked: locked.toFixed(2) as MoneyString,
    }
  }, [withdrawals])

  function decide(status: MoneyWithdrawalStatus, title: string) {
    if (!selected) return
    if (status === 'REJECTED' && !reason.trim()) {
      toast.error('Reason required to reject')
      return
    }
    if (status === 'APPROVED') approveWithdrawal(selected.id)
    else if (status === 'REJECTED') rejectWithdrawal(selected.id, reason.trim())
    toast.success(title, { description: reason.trim() || selected.id })
    setSelectedId(null)
    setReason('')
  }

  function openReview(w: MoneyWithdrawal) {
    setSelectedId(w.id)
    setReason('')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Withdrawals"
        description="Requested funds are locked against the balance. Approving releases payment (demo state)."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Awaiting review</p>
          <p className="mt-2 text-stat-md text-fg">{stats.pending}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Approved, awaiting payment</p>
          <p className="mt-2 text-stat-md text-fg">{stats.approved}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Paid (demo set)</p>
          <p className="mt-2 text-stat-md text-fg">{stats.paid}</p>
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
                    No withdrawals in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{investorName(w.userId)}</p>
                      <p className="font-mono text-[11px] text-fg-subtle">{w.userId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Money value={w.amount as MoneyString} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Money value={availableBalance(w.userId)} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{w.destination}</td>
                    <td className="px-4 py-3 text-fg-muted">{w.destinationDetail}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {formatDateTime(w.requestedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminWithdrawalPill status={w.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {w.status === 'PENDING' ? (
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
                      {investorName(selected.userId)} · {selected.userId}
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
                      <Money value={availableBalance(selected.userId)} size="sm" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Bank / wallet</dt>
                    <dd className="text-fg">
                      {selected.destination} · {selected.destinationDetail}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Requested</dt>
                    <dd className="text-fg">{formatDateTime(selected.requestedAt)}</dd>
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
                <Button size="sm" onClick={() => decide('APPROVED', 'Withdrawal approved')}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => decide('REJECTED', 'Withdrawal rejected')}
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
