'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ROUTES, type User } from '@meridian/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RotateCcw, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  mapAccountStatus,
  mapKycStatus,
} from '@/components/admin/admin-api-adapters'
import { AdminKycDocumentsGrid } from '@/components/admin/admin-kyc-review'
import { AdminListPagination } from '@/components/admin/admin-list-pagination'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  loadAdminViewState,
  rememberAdminListLocation,
  restoreAdminScroll,
  saveAdminViewState,
} from '@/lib/admin-nav'
import { formatDateTime } from '@/lib/format'
import { kycService, type KycProfile } from '@/services/kyc.service'

type TabFilter = 'pending' | 'cleared' | 'all'

type KycQueueItem = User & {
  kyc: KycProfile & { referenceId?: string | null; assignedReviewerId?: string | null }
  reviewedBy?: { id: string; email: string; name: string } | null
  approvedByLabel?: string | null
  reviewedAt?: string | null
}

const kycAdminKeys = {
  queue: ['admin', 'kyc', 'queue'] as const,
}

const VIEW_KEY = 'admin:kyc-queue:view'
const PAGE_SIZE = 20

function statusForTab(tab: TabFilter): string | undefined {
  switch (tab) {
    case 'pending':
      return 'UNDER_REVIEW'
    case 'cleared':
      return 'APPROVED'
    default:
      return undefined
  }
}

function tabForStatus(status: string | null): TabFilter {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'CLEARED':
      return 'cleared'
    case 'ALL':
      return 'all'
    case 'UNDER_REVIEW':
    case 'PENDING':
    default:
      return 'pending'
  }
}

function rememberAndOpen() {
  rememberAdminListLocation()
  saveAdminViewState(VIEW_KEY, {})
}

function KycReviewCard({
  account,
  onApprove,
  onReject,
  onResubmit,
  busy,
}: {
  account: KycQueueItem
  onApprove: (userId: string) => void | Promise<unknown>
  onReject: (userId: string, reason: string) => void | Promise<unknown>
  onResubmit: (userId: string, reason: string) => void | Promise<unknown>
  busy: boolean
}) {
  const [reason, setReason] = useState('')
  const country = account.country ?? '—'
  const submission = account.kyc.submission as
    | {
        city?: string
        addressLine1?: string
        occupation?: string
        dateOfBirth?: string
        primaryDocumentType?: string
      }
    | undefined
  const docs = (account.kyc.documents ?? []).map((d) => ({
    id: d.id,
    kind: d.kind,
    documentType: d.kind,
    side: d.side,
    status: d.status,
    mimeType: d.mimeType,
    originalName: d.originalName,
    downloadUrl: d.downloadUrl,
  }))

  return (
    <AdminPanel className="overflow-hidden" glow>
      <AdminPanelHeader
        title={`${account.firstName} ${account.lastName}`}
        description={`${account.id} · ${account.email}`}
        action={
          <div className="flex flex-wrap gap-2">
            <AdminKycPill status={mapKycStatus(account.kycStatus)} />
            <AdminAccountPill status={mapAccountStatus(account.status, account.kycStatus)} />
          </div>
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-5">
        <dl className="grid gap-3 text-caption sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['User ID', account.id],
            ['Email', account.email],
            ['Phone', account.phone ?? '—'],
            ['Country', country],
            ['City', submission?.city ?? '—'],
            ['Address', submission?.addressLine1 ?? '—'],
            ['Occupation', submission?.occupation ?? '—'],
            ['DOB', submission?.dateOfBirth ?? '—'],
            ['ID type', submission?.primaryDocumentType?.replaceAll('_', ' ') ?? '—'],
            ['Registered', formatDateTime(account.createdAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-fg-subtle">{k}</dt>
              <dd className="mt-0.5 break-all text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="mb-3 text-caption font-medium text-fg">Uploaded documents</p>
          <AdminKycDocumentsGrid ownerId={account.id} documents={docs} />
        </div>

        <FormField label="Decision reason" hint="Required for reject / resubmission.">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required when rejecting or requesting resubmission…"
            className="border-white/10 bg-white/[0.04]"
          />
        </FormField>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              void onApprove(account.id)
            }}
          >
            <Check aria-hidden />
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => {
              const note = reason.trim()
              if (note.length < 3) {
                toast.error('Add a rejection reason (at least 3 characters)')
                return
              }
              void onReject(account.id, note)
            }}
          >
            <X aria-hidden />
            Reject
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              const note = reason.trim()
              if (note.length < 3) {
                toast.error('Add a resubmission note (at least 3 characters)')
                return
              }
              void onResubmit(account.id, note)
            }}
          >
            <RotateCcw aria-hidden />
            Request resubmission
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={ROUTES.admin.kycReview(account.id)} onClick={rememberAndOpen}>
              Full review
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={ROUTES.admin.user(account.id)} onClick={rememberAndOpen}>
              Full profile
            </Link>
          </Button>
        </div>
      </div>
    </AdminPanel>
  )
}

function ClearedKycCard({ account }: { account: KycQueueItem }) {
  const clearedAt = account.reviewedAt ?? account.kyc.reviewedAt
  const approvedBy = account.approvedByLabel ?? account.reviewedBy?.email ?? null
  const approvedByName = account.reviewedBy?.name ?? null
  const referenceId = account.kyc.referenceId ?? null
  const profileHref = ROUTES.admin.user(account.id)

  return (
    <AdminPanel className="overflow-hidden transition-colors hover:border-white/15">
      <Link
        href={profileHref}
        onClick={rememberAndOpen}
        className="block px-4 py-4 sm:px-5 sm:py-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-body font-medium text-fg">
              {account.firstName} {account.lastName}
            </p>
            <p className="truncate text-caption text-fg-muted">{account.email}</p>
            {referenceId ? (
              <p className="truncate text-caption text-fg-subtle">Ref {referenceId}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex whitespace-nowrap rounded-full border border-profit/25 bg-profit/15 px-2 py-0.5 text-[11px] font-medium text-profit">
              CLEARED
            </span>
            <AdminKycPill status={mapKycStatus('APPROVED')} />
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-caption sm:grid-cols-2">
          <div>
            <dt className="text-fg-subtle">Cleared</dt>
            <dd className="mt-0.5 text-fg">
              {clearedAt ? formatDateTime(clearedAt) : 'Not recorded'}
            </dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Submitted</dt>
            <dd className="mt-0.5 text-fg">
              {account.kyc.submittedAt ? formatDateTime(account.kyc.submittedAt) : '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-fg-subtle">Approved by</dt>
            <dd className="mt-0.5 break-all text-fg">
              {approvedBy ?? 'Not recorded'}
              {approvedByName && approvedByName !== approvedBy ? (
                <span className="mt-0.5 block text-fg-muted">{approvedByName}</span>
              ) : null}
            </dd>
          </div>
        </dl>
      </Link>

      <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-4 py-3 sm:px-5">
        <Button asChild size="sm" variant="secondary">
          <Link href={profileHref} onClick={rememberAndOpen}>
            View Profile
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={ROUTES.admin.kycReview(account.id)} onClick={rememberAndOpen}>
            KYC detail
          </Link>
        </Button>
      </div>
    </AdminPanel>
  )
}

function AllKycRow({ account }: { account: KycQueueItem }) {
  const isCleared = account.kyc.status === 'APPROVED' || account.kycStatus === 'APPROVED'
  const profileHref = ROUTES.admin.user(account.id)
  const clearedAt = account.reviewedAt ?? account.kyc.reviewedAt
  const approvedBy = account.approvedByLabel ?? account.reviewedBy?.email ?? null

  return (
    <AdminPanel className="overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-body font-medium text-fg">
            {account.firstName} {account.lastName}
          </p>
          <p className="truncate text-caption text-fg-muted">{account.email}</p>
          {isCleared ? (
            <p className="text-caption text-fg-subtle">
              Cleared {clearedAt ? formatDateTime(clearedAt) : '—'}
              {approvedBy ? ` · ${approvedBy}` : ' · Not recorded'}
            </p>
          ) : (
            <p className="text-caption text-fg-subtle">
              Updated {formatDateTime(account.kyc.submittedAt ?? account.createdAt)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isCleared ? (
            <span className="inline-flex whitespace-nowrap rounded-full border border-profit/25 bg-profit/15 px-2 py-0.5 text-[11px] font-medium text-profit">
              CLEARED
            </span>
          ) : (
            <AdminKycPill status={mapKycStatus(account.kyc.status ?? account.kycStatus)} />
          )}
          <Button asChild size="sm" variant="secondary">
            <Link href={profileHref} onClick={rememberAndOpen}>
              View Profile
            </Link>
          </Button>
          {!isCleared ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={ROUTES.admin.kycReview(account.id)} onClick={rememberAndOpen}>
                Review
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </AdminPanel>
  )
}

export function AdminKycQueue() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tab = tabForStatus(searchParams.get('status'))
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const qParam = searchParams.get('q') ?? ''
  const [q, setQ] = useState(qParam)

  useEffect(() => {
    setQ(qParam)
  }, [qParam])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = q.trim()
      if (next === qParam) return
      const params = new URLSearchParams(searchParams.toString())
      if (next.length >= 2) params.set('q', next)
      else params.delete('q')
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [q, qParam, pathname, router, searchParams])

  function selectTab(next: TabFilter) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'pending') params.delete('status')
    else if (next === 'cleared') params.set('status', 'APPROVED')
    else params.set('status', 'ALL')
    params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function setPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextPage <= 1) params.delete('page')
    else params.set('page', String(nextPage))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const listStatus = statusForTab(tab)
  const searchQ = qParam.trim().length >= 2 ? qParam.trim() : undefined

  const { data, isLoading } = useQuery({
    queryKey: [...kycAdminKeys.queue, tab, page, searchQ ?? ''],
    queryFn: () =>
      kycService.adminList({
        status: listStatus,
        page,
        limit: PAGE_SIZE,
        sortOrder: 'desc',
        q: searchQ,
      }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const pendingCountQuery = useQuery({
    queryKey: [...kycAdminKeys.queue, 'pending-count'],
    queryFn: () =>
      kycService.adminList({ status: 'UNDER_REVIEW', page: 1, limit: 1, sortOrder: 'desc' }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    rememberAdminListLocation()
    const saved = loadAdminViewState(VIEW_KEY)
    if (saved?.scrollY != null) restoreAdminScroll(saved.scrollY)
    const persist = () => saveAdminViewState(VIEW_KEY, {})
    window.addEventListener('pagehide', persist)
    return () => {
      persist()
      window.removeEventListener('pagehide', persist)
    }
  }, [])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: kycAdminKeys.queue })
  }

  const approve = useMutation({
    mutationFn: (userId: string) => kycService.adminApprove(userId),
    onSuccess: () => {
      invalidate()
      toast.success('KYC approved')
    },
    onError: (err: Error) => toast.error(err.message || 'Approve failed'),
  })
  const reject = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      kycService.adminReject(userId, { reason }),
    onSuccess: (_data, vars) => {
      invalidate()
      toast.message('KYC rejected', { description: vars.reason })
    },
    onError: (err: Error) => toast.error(err.message || 'Reject failed'),
  })
  const resubmit = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      kycService.adminRequestInformation(userId, { reason }),
    onSuccess: (_data, vars) => {
      invalidate()
      toast.success('Resubmission requested', { description: vars.reason })
    },
    onError: (err: Error) => toast.error(err.message || 'Request resubmission failed'),
  })

  const items = (data?.items ?? []) as KycQueueItem[]
  const pagination = data?.pagination
  const busy = approve.isPending || reject.isPending || resubmit.isPending
  const pendingCount =
    pendingCountQuery.data?.pagination?.total ??
    (tab === 'pending' && !searchQ ? pagination?.total : undefined)

  const emptyMessage =
    tab === 'cleared'
      ? 'No cleared KYC records yet.'
      : tab === 'all'
        ? 'No KYC records match this filter.'
        : 'No KYC requests under review.'

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="KYC queue"
        description="Review pending identity submissions and browse cleared KYC history."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminPanel className="p-4" glow>
          <p className="text-caption text-fg-muted">Pending review</p>
          <p className="mt-2 text-stat-md text-fg">
            {pendingCountQuery.isLoading && pendingCount == null ? '—' : (pendingCount ?? '—')}
          </p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">SLA</p>
          <p className="mt-2 text-stat-md text-fg">24–48h</p>
        </AdminPanel>
        <AdminPanel className="p-4">
          <p className="text-caption text-fg-muted">Notify on decision</p>
          <p className="mt-2 text-stat-md text-fg">Instant</p>
        </AdminPanel>
      </div>

      <AdminPanel className="p-4 sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="border-white/10 bg-white/[0.04] pl-10"
            placeholder="Search name, email, user ID, KYC reference…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </AdminPanel>

      <Tabs value={tab} onValueChange={(v) => selectTab(v as TabFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="cleared">Cleared</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {items.length === 0 ? (
        <AdminPanel className="p-10 text-center text-body-sm text-fg-muted">
          {isLoading ? 'Loading KYC queue…' : emptyMessage}
        </AdminPanel>
      ) : tab === 'pending' ? (
        <ul className="space-y-5">
          {items.map((account) => (
            <li key={account.id}>
              <KycReviewCard
                account={account}
                busy={busy}
                onApprove={(userId) => approve.mutateAsync(userId)}
                onReject={(userId, reason) => reject.mutateAsync({ userId, reason })}
                onResubmit={(userId, reason) => resubmit.mutateAsync({ userId, reason })}
              />
            </li>
          ))}
        </ul>
      ) : tab === 'cleared' ? (
        <ul className="space-y-4">
          {items.map((account) => (
            <li key={account.id}>
              <ClearedKycCard account={account} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {items.map((account) => (
            <li key={account.id}>
              <AllKycRow account={account} />
            </li>
          ))}
        </ul>
      )}

      <AdminListPagination pagination={pagination} onPageChange={setPage} />
    </div>
  )
}
