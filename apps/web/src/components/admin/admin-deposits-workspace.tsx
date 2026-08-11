'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminDepositRow,
  investorName,
  mapDepositStatus,
  methodLabel,
} from '@/components/admin/admin-api-adapters'
import { AdminListPagination } from '@/components/admin/admin-list-pagination'
import { AdminPanel } from '@/components/admin/admin-panel'
import { AdminDepositPill } from '@/components/admin/admin-status-pills'
import { DepositProofViewer } from '@/components/common/deposit-proof-viewer'
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
import { useAdminDeposit, useAdminDeposits, useReviewDeposit } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'

type TabFilter =
  | 'pending'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'all'
type DepositDecision = 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION'

function statusForTab(tab: TabFilter): string | undefined {
  switch (tab) {
    case 'pending':
      return 'PENDING'
    case 'review':
      return 'UNDER_REVIEW'
    case 'approved':
      return 'APPROVED'
    case 'rejected':
      return 'REJECTED'
    case 'cancelled':
      return 'CANCELLED'
    case 'expired':
      return 'EXPIRED'
    default:
      return undefined
  }
}

function tabForStatus(status: string | null): TabFilter {
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING':
      return 'pending'
    case 'UNDER_REVIEW':
      return 'review'
    case 'APPROVED':
      return 'approved'
    case 'REJECTED':
      return 'rejected'
    case 'CANCELLED':
      return 'cancelled'
    case 'EXPIRED':
      return 'expired'
    case 'ALL':
    case '':
      return 'all'
    default:
      return 'pending'
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function gatewayLabel(deposit: AdminDepositRow): string {
  const details = asRecord(deposit.submissionDetails)
  const gateway =
    (typeof deposit.gateway === 'string' && deposit.gateway) ||
    (typeof details?.gateway === 'string' ? details.gateway : null)
  if (gateway === 'oxapay') return 'OxaPay'
  return gateway ? String(gateway) : '—'
}

function oxapayTrackId(deposit: AdminDepositRow): string {
  const details = asRecord(deposit.submissionDetails)
  if (typeof deposit.oxapayTrackId === 'string' && deposit.oxapayTrackId.trim()) {
    return deposit.oxapayTrackId
  }
  if (typeof details?.oxapayTrackId === 'string' && details.oxapayTrackId.trim()) {
    return details.oxapayTrackId
  }
  if (gatewayLabel(deposit) === 'OxaPay' && deposit.userReference) {
    return deposit.userReference
  }
  return '—'
}

function confirmationLabel(deposit: AdminDepositRow): string {
  if (deposit.status !== 'APPROVED') return '—'
  const details = asRecord(deposit.submissionDetails)
  if (details?.oxapayConfirmedAt || details?.oxapayVerificationResult === 'ok') {
    return 'Provider auto-confirmed'
  }
  if (gatewayLabel(deposit) === 'OxaPay') return 'Provider confirmed'
  return 'Admin approved'
}

export function AdminDepositsWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<TabFilter>(() => tabForStatus(searchParams.get('status')))
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    setTab(tabForStatus(searchParams.get('status')))
  }, [searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [q])

  function selectTab(next: TabFilter) {
    setTab(next)
    setPage(1)
    const params = new URLSearchParams(searchParams.toString())
    const status = statusForTab(next)
    if (status) params.set('status', status)
    else params.delete('status')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const { data, isLoading } = useAdminDeposits({
    status: statusForTab(tab),
    q: debouncedQ.length >= 2 ? debouncedQ : undefined,
    page,
    limit: 20,
  })
  const reviewDeposit = useReviewDeposit()
  const deposits = useMemo(() => (data?.items ?? []) as AdminDepositRow[], [data?.items])
  const pagination = data?.pagination
  const { data: selectedDetail } = useAdminDeposit(selectedId ?? '', {
    enabled: Boolean(selectedId),
  })

  const selected = useMemo(() => {
    if (!selectedId) return null
    const fromDetail = selectedDetail as AdminDepositRow | undefined
    if (fromDetail?.id === selectedId) return fromDetail
    return deposits.find((d) => d.id === selectedId) ?? null
  }, [deposits, selectedDetail, selectedId])

  const selectedActionable =
    selected?.status === 'PENDING' || selected?.status === 'UNDER_REVIEW'

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
        description="Pending and under-review need action. Approved OxaPay gateway deposits stay listed under Approved after auto-confirm."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Awaiting (page)</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.awaiting}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Under review (page)</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.review}</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Approved (page)</p>
          <p className="mt-2 text-stat-md text-fg">{isLoading ? '—' : stats.approved}</p>
        </AdminPanel>
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Value pending (page)</p>
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
            placeholder="Search reference, track ID, investor, method…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </AdminPanel>

      <Tabs value={tab} onValueChange={(v) => selectTab(v as TabFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="review">Under review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <AdminPanel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Proof</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method / gateway</th>
                <th className="px-4 py-3 font-medium">Track / hash</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Confirmed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-fg-muted">
                    {isLoading ? 'Loading deposits…' : 'No deposits match this filter.'}
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
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
                    <td className="px-4 py-3 text-fg">
                      <div>{investorName(d.user)}</div>
                      <div className="text-[11px] text-fg-subtle">{d.user?.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <DualMoney
                        usd={d.amount as MoneyString}
                        inr={(d.amountInr ?? d.depositInr) as MoneyString | null | undefined}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      <div>{methodLabel(d.method)}</div>
                      <div className="text-[11px] text-fg-subtle">{gatewayLabel(d)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">
                      <div>{oxapayTrackId(d)}</div>
                      <div className="truncate max-w-[10rem]">{d.txHash ?? '—'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {formatDateTime(d.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      <div>{d.reviewedAt ? formatDateTime(d.reviewedAt) : '—'}</div>
                      <div className="text-[11px] text-fg-subtle">{confirmationLabel(d)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <AdminDepositPill status={mapDepositStatus(d.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openReview(d)}>
                          {d.status === 'APPROVED' ? 'View' : 'Review'}
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
                <SheetTitle>
                  {selectedActionable ? 'Deposit review' : 'Deposit record'}
                </SheetTitle>
                <SheetDescription>{selected.id}</SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <DepositProofViewer proofUrl={proofUrl} hasProof={selected.hasProof} compact />
                <dl className="grid gap-3 text-caption">
                  <div>
                    <dt className="text-fg-subtle">Investor</dt>
                    <dd className="text-fg">
                      {investorName(selected.user)} · {selected.user?.email ?? '—'}
                    </dd>
                    <dd className="font-mono text-[11px] text-fg-subtle">{selected.user?.id ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Amount</dt>
                    <dd>
                      <DualMoney
                        usd={selected.amount as MoneyString}
                        inr={
                          (selected.amountInr ?? selected.depositInr) as
                            | MoneyString
                            | null
                            | undefined
                        }
                        size="sm"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Gateway</dt>
                    <dd className="text-fg">{gatewayLabel(selected)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">OxaPay track ID</dt>
                    <dd className="break-all font-mono text-fg">{oxapayTrackId(selected)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Order / reference</dt>
                    <dd className="font-mono text-fg">{selected.reference}</dd>
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
                    <dt className="text-fg-subtle">Method</dt>
                    <dd className="text-fg">{methodLabel(selected.method)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Submitted</dt>
                    <dd className="text-fg">{formatDateTime(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Approved / confirmed</dt>
                    <dd className="text-fg">
                      {selected.reviewedAt ? formatDateTime(selected.reviewedAt) : '—'}
                    </dd>
                    <dd className="text-[11px] text-fg-subtle">{confirmationLabel(selected)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Status</dt>
                    <dd className="mt-1">
                      <AdminDepositPill status={mapDepositStatus(selected.status)} />
                    </dd>
                  </div>
                </dl>
                {selectedActionable ? (
                  <FormField label="Reason / note" hint="Required for reject and need info.">
                    <Textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="border-white/10 bg-white/[0.04]"
                      placeholder="Optional on approve…"
                    />
                  </FormField>
                ) : null}
              </SheetBody>
              <SheetFooter>
                {selectedActionable ? (
                  <>
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
                      variant="ghost"
                      disabled={reviewDeposit.isPending}
                      onClick={() => void decide('REJECT', 'Deposit rejected')}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button asChild size="sm">
                    <Link href={ROUTES.admin.deposit(selected.id)}>Open full record</Link>
                  </Button>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
