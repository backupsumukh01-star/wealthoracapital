'use client'

import Link from 'next/link'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { FileImage, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminDepositPill } from '@/components/admin/admin-status-pills'
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
import type { MoneyDeposit, MoneyDepositStatus } from '@/lib/investor-lifecycle'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

type TabFilter = 'pending' | 'review' | 'approved' | 'rejected' | 'all'

function matchesTab(status: MoneyDepositStatus, tab: TabFilter) {
  switch (tab) {
    case 'pending':
      return status === 'PENDING' || status === 'NEED_INFO'
    case 'review':
      return status === 'UNDER_REVIEW'
    case 'approved':
      return status === 'APPROVED'
    case 'rejected':
      return status === 'REJECTED'
    default:
      return true
  }
}

function ProofThumb({ label }: { label: string }) {
  return (
    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-accent-500/25 via-info/15 to-transparent">
      <FileImage className="size-4 text-accent-300" aria-hidden />
      <span className="mt-0.5 max-w-[2.75rem] truncate text-[9px] text-fg-subtle">{label}</span>
    </div>
  )
}

export function AdminDepositsWorkspace() {
  const { deposits, accounts, approveDeposit, rejectDeposit, needInfoDeposit } =
    useInvestorLifecycle()
  const [tab, setTab] = useState<TabFilter>('pending')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of accounts) {
      map.set(a.userId, `${a.firstName} ${a.lastName}`)
    }
    return map
  }, [accounts])

  const selected = useMemo(
    () => (selectedId ? deposits.find((d) => d.id === selectedId) ?? null : null),
    [deposits, selectedId],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return deposits
      .filter((d) => matchesTab(d.status, tab))
      .filter((d) => {
        if (!needle) return true
        const name = (nameByUserId.get(d.userId) ?? d.userId).toLowerCase()
        return (
          d.id.toLowerCase().includes(needle) ||
          d.reference.toLowerCase().includes(needle) ||
          d.method.toLowerCase().includes(needle) ||
          d.userId.toLowerCase().includes(needle) ||
          name.includes(needle)
        )
      })
      .sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt))
  }, [deposits, tab, q, nameByUserId])

  function investorName(userId: string) {
    return nameByUserId.get(userId) ?? userId
  }

  const stats = useMemo(() => {
    const awaiting = deposits.filter((d) => d.status === 'PENDING' || d.status === 'NEED_INFO').length
    const review = deposits.filter((d) => d.status === 'UNDER_REVIEW').length
    const approved = deposits.filter((d) => d.status === 'APPROVED').length
    const pendingValue = deposits
      .filter((d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW' || d.status === 'NEED_INFO')
      .reduce((sum, d) => sum + Number(d.amount), 0)
    return { awaiting, review, approved, pendingValue: pendingValue.toFixed(2) as MoneyString }
  }, [deposits])

  function openReview(d: MoneyDeposit) {
    setSelectedId(d.id)
    setReason(d.note ?? '')
  }

  function decide(action: 'APPROVED' | 'REJECTED' | 'NEED_INFO', toastTitle: string) {
    if (!selected) return
    if ((action === 'REJECTED' || action === 'NEED_INFO') && !reason.trim()) {
      toast.error('Reason required')
      return
    }
    if (action === 'APPROVED') approveDeposit(selected.id)
    else if (action === 'REJECTED') rejectDeposit(selected.id, reason.trim())
    else needInfoDeposit(selected.id, reason.trim())
    toast.success(toastTitle, {
      description: reason.trim() || selected.id,
    })
    setSelectedId(null)
    setReason('')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Deposits"
        description="Match each payment against its proof before crediting. Decisions update local demo state."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Awaiting review</p>
          <p className="mt-2 text-stat-md text-fg">{stats.awaiting}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Under review</p>
          <p className="mt-2 text-stat-md text-fg">{stats.review}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Approved (demo set)</p>
          <p className="mt-2 text-stat-md text-fg">{stats.approved}</p>
        </AdminPanel>
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Value pending</p>
          <div className="mt-2">
            <Money value={stats.pendingValue} size="md" />
          </div>
        </AdminPanel>
      </div>

      <AdminPanel className="p-4 sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="border-white/10 bg-white/[0.04] pl-10"
            placeholder="Search reference, investor, method…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </AdminPanel>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabFilter)}
      >
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="review">Under review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <AdminPanel className="overflow-hidden">
        <AdminPanelHeader title="Deposit queue" description={`${filtered.length} shown · oldest first`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Proof</th>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-fg-muted">
                    No deposits in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <ProofThumb label={d.proofLabel ?? 'Proof'} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{investorName(d.userId)}</p>
                      <p className="font-mono text-[11px] text-fg-subtle">{d.userId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Money value={d.amount as MoneyString} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{d.method}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">{d.reference}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {formatDateTime(d.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminDepositPill status={d.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openReview(d)}>
                          Review
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={ROUTES.admin.deposit(d.id)}>Open</Link>
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
                <SheetTitle>Deposit review</SheetTitle>
                <SheetDescription>{selected.id}</SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <div className="flex aspect-video flex-col justify-between rounded-xl border border-white/10 bg-gradient-to-br from-accent-500/30 via-info/15 to-transparent p-4">
                  <FileImage className="size-6 text-accent-300" aria-hidden />
                  <div>
                    <p className="text-caption font-medium text-fg">{selected.proofLabel ?? 'Proof'}</p>
                    <p className="text-[11px] text-fg-subtle">Screenshot placeholder</p>
                  </div>
                </div>
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
                    <dt className="text-fg-subtle">Method / ref</dt>
                    <dd className="text-fg">
                      {selected.method} · {selected.reference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Submitted</dt>
                    <dd className="text-fg">{formatDateTime(selected.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Status</dt>
                    <dd className="mt-1">
                      <AdminDepositPill status={selected.status} />
                    </dd>
                  </div>
                </dl>
                <FormField label="Reason / note" hint="Required for reject and need info.">
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
                <Button size="sm" onClick={() => decide('APPROVED', 'Deposit approved')}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => decide('NEED_INFO', 'More info requested')}>
                  Need info
                </Button>
                <Button size="sm" variant="danger" onClick={() => decide('REJECTED', 'Deposit rejected')}>
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
