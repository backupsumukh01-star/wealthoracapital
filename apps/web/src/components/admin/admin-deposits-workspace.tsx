'use client'

import Link from 'next/link'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminDepositRow,
  investorName,
  mapDepositStatus,
  methodLabel,
} from '@/components/admin/admin-api-adapters'
import { AdminPanel } from '@/components/admin/admin-panel'
import { AdminDepositPill } from '@/components/admin/admin-status-pills'
import { DepositProofViewer } from '@/components/common/deposit-proof-viewer'
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
import { useAdminDeposit, useAdminDeposits, useReviewDeposit } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

type TabFilter = 'pending' | 'review' | 'approved' | 'rejected' | 'all'
type DepositDecision = 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION'

function matchesTab(status: string, tab: TabFilter) {
  switch (tab) {
    case 'pending':
      return status === 'PENDING'
    case 'review':
      return status === 'UNDER_REVIEW'
    case 'approved':
      return status === 'APPROVED'
    case 'rejected':
      return status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED'
    default:
      return true
  }
}

export function AdminDepositsWorkspace() {
  const { data, isLoading } = useAdminDeposits()
  const reviewDeposit = useReviewDeposit()
  const deposits = (data?.items ?? []) as AdminDepositRow[]
  const [tab, setTab] = useState<TabFilter>('pending')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const { data: selectedDetail } = useAdminDeposit(selectedId ?? '', {
    enabled: Boolean(selectedId),
  })

  const selected = useMemo(() => {
    if (!selectedId) return null
    const fromDetail = selectedDetail as AdminDepositRow | undefined
    if (fromDetail?.id === selectedId) return fromDetail
    return deposits.find((d) => d.id === selectedId) ?? null
  }, [deposits, selectedDetail, selectedId])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return deposits
      .filter((d) => matchesTab(d.status, tab))
      .filter((d) => {
        if (!needle) return true
        const name = investorName(d.user, d.user?.id ?? '').toLowerCase()
        const method = methodLabel(d.method).toLowerCase()
        return (
          d.id.toLowerCase().includes(needle) ||
          d.reference.toLowerCase().includes(needle) ||
          method.includes(needle) ||
          (d.user?.id ?? '').toLowerCase().includes(needle) ||
          name.includes(needle)
        )
      })
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  }, [deposits, tab, q])

  const stats = useMemo(() => {
    const awaiting = deposits.filter((d) => d.status === 'PENDING').length
    const review = deposits.filter((d) => d.status === 'UNDER_REVIEW').length
    const approved = deposits.filter((d) => d.status === 'APPROVED').length
    const pendingValue = deposits
      .filter((d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW')
      .reduce((sum, d) => sum + Number(d.amount), 0)
    return { awaiting, review, approved, pendingValue: pendingValue.toFixed(2) as MoneyString }
  }, [deposits])

  function openReview(d: AdminDepositRow) {
    setSelectedId(d.id)
    setReason(d.rejectionReason ?? '')
  }

  async function decide(decision: DepositDecision, toastTitle: string) {
    if (!selected) return
    if ((decision === 'REJECT' || decision === 'REQUEST_INFORMATION') && !reason.trim()) {
      toast.error('Reason required')
      return
    }
    try {
      await reviewDeposit.mutateAsync({
        id: selected.id,
        decision,
        reason: reason.trim() || undefined,
      })
      toast.success(toastTitle, {
        description: reason.trim() || selected.id,
      })
      setSelectedId(null)
      setReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    }
  }

  const proofUrl = selected?.proofImageUrl ?? selected?.proofUrl ?? null

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Deposits"
        description="Match each payment against its proof before crediting. Decisions update via the admin API."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Awaiting review</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.awaiting}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Under review</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.review}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Approved</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.approved}</p>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="review">Under review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <AdminPanel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Proof</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-fg-muted">
                    {isLoading ? 'Loading deposits…' : 'No deposits match this filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-fg-subtle">
                        {d.hasProof || d.proofImageUrl ? 'On file' : 'Missing'}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">{d.reference}</td>
                    <td className="px-4 py-3 text-fg">{investorName(d.user)}</td>
                    <td className="px-4 py-3">
                      <Money value={d.amount as MoneyString} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{methodLabel(d.method)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {formatDateTime(d.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminDepositPill status={mapDepositStatus(d.status)} />
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
                <DepositProofViewer proofUrl={proofUrl} hasProof={selected.hasProof} compact />
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
                    <dt className="text-fg-subtle">Hash / ref</dt>
                    <dd className="break-all font-mono text-fg">
                      {selected.hashId ?? selected.txHash ?? selected.userReference ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Coin / network</dt>
                    <dd className="text-fg">
                      {[selected.coin, selected.network].filter(Boolean).join(' · ') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Deposit address</dt>
                    <dd className="break-all font-mono text-fg">
                      {selected.depositAddress ?? selected.walletAddress ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Method / ref</dt>
                    <dd className="text-fg">
                      {methodLabel(selected.method)} · {selected.reference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Submitted</dt>
                    <dd className="text-fg">{formatDateTime(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Status</dt>
                    <dd className="mt-1">
                      <AdminDepositPill status={mapDepositStatus(selected.status)} />
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
                <Button
                  size="sm"
                  disabled={reviewDeposit.isPending}
                  onClick={() => void decide('APPROVE', 'Deposit approved')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={reviewDeposit.isPending}
                  onClick={() => void decide('REQUEST_INFORMATION', 'More info requested')}
                >
                  Need info
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={reviewDeposit.isPending}
                  onClick={() => void decide('REJECT', 'Deposit rejected')}
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
