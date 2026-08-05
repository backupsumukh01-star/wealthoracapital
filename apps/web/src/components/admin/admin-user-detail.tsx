'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES, type MoneyString, type UserStatus } from '@meridian/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2, FileImage } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminDepositRow,
  type AdminWithdrawalRow,
  mapAccountStatus,
  mapDepositStatus,
  mapKycStatus,
  mapWithdrawalStatus,
  methodLabel,
} from '@/components/admin/admin-api-adapters'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import {
  AdminAccountPill,
  AdminDepositPill,
  AdminKycPill,
  AdminWithdrawalPill,
} from '@/components/admin/admin-status-pills'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/form-field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  adminQueryKeys,
  useAdminActivity,
  useAdminDeposits,
  useAdminReturns,
  useAdminTrades,
  useAdminUser,
  useAdminWithdrawals,
} from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'
import { adminService } from '@/services/admin.service'
import { kycService } from '@/services/kyc.service'

function DocPanel({ label, accent }: { label: string; accent: string }) {
  return (
    <div
      className={`relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${accent} p-3`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.08),transparent_55%)]" />
      <div className="relative flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
        <FileImage className="size-3.5 text-accent-300" aria-hidden />
        {label}
      </div>
      <p className="relative text-caption text-fg-subtle">Document on file via KYC API</p>
    </div>
  )
}

export function AdminUserDetailWorkspace() {
  const params = useParams<{ userId: string }>()
  const userId = decodeURIComponent(params.userId)
  const queryClient = useQueryClient()
  const { data: user, isLoading, isError } = useAdminUser(userId)
  const { data: depositsData } = useAdminDeposits()
  const { data: withdrawalsData } = useAdminWithdrawals()
  const { data: returnsData } = useAdminReturns()
  const { data: tradesData } = useAdminTrades()
  const { data: activityData } = useAdminActivity()
  const [noteDraft, setNoteDraft] = useState('')

  const { data: walletRow } = useQuery({
    queryKey: [...adminQueryKeys.all, 'wallets', userId],
    queryFn: async () => {
      const res = await adminService.wallets({ q: userId })
      return (
        res.items.find((w) => w.user.id === userId) ??
        res.items.find((w) => w.user.email === user?.email) ??
        null
      )
    },
    enabled: Boolean(userId),
  })

  const { data: kycDetail } = useQuery({
    queryKey: ['admin', 'kyc', userId],
    queryFn: () => kycService.adminGet(userId),
    enabled: Boolean(userId),
  })

  const suspend = useMutation({
    mutationFn: () => adminService.suspendUser(userId, 'Suspended by operator'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.message('Account suspended')
    },
    onError: (err: Error) => toast.error(err.message || 'Suspend failed'),
  })

  const enable = useMutation({
    mutationFn: () => adminService.enableUser(userId, 'Re-enabled by operator'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.success('Account activated')
    },
    onError: (err: Error) => toast.error(err.message || 'Activate failed'),
  })

  const approveKyc = useMutation({
    mutationFn: () => kycService.adminApprove(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc', userId] })
      toast.success('KYC approved')
    },
    onError: (err: Error) => toast.error(err.message || 'KYC approve failed'),
  })

  const rejectKyc = useMutation({
    mutationFn: (reason: string) => kycService.adminReject(userId, { reason }),
    onSuccess: (_data, reason) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.message('KYC rejected', { description: reason })
    },
    onError: (err: Error) => toast.error(err.message || 'KYC reject failed'),
  })

  const requestInfo = useMutation({
    mutationFn: (reason: string) => kycService.adminRequestInformation(userId, { reason }),
    onSuccess: (_data, reason) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.message('Resubmission requested', { description: reason })
    },
    onError: (err: Error) => toast.error(err.message || 'Request info failed'),
  })

  const deposits = useMemo(() => {
    const items = (depositsData?.items ?? []) as AdminDepositRow[]
    return items.filter((d) => d.user?.id === userId)
  }, [depositsData, userId])

  const withdrawals = useMemo(() => {
    const items = (withdrawalsData?.items ?? []) as AdminWithdrawalRow[]
    return items.filter((w) => w.user?.id === userId)
  }, [withdrawalsData, userId])

  const returns = returnsData?.items ?? []
  const trades = tradesData?.items ?? []
  const timeline = (activityData?.items ?? []).filter(
    (e) => e.title.toLowerCase().includes(userId.toLowerCase()) || e.id.includes(userId),
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="User profile" description="Loading investor…" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <PageHeader title="User not found" description={`No investor matches ${userId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.users}>Back to users</Link>
        </Button>
      </div>
    )
  }

  const kycStatus = mapKycStatus(user.kycStatus)
  const accountStatus = mapAccountStatus(user.status, user.kycStatus)
  const showMarketLists = accountStatus === 'VERIFIED' || kycStatus === 'APPROVED'
  const username = user.email.split('@')[0] || user.id
  const available = (walletRow?.availableBalance ?? walletRow?.balance ?? '0.00') as MoneyString
  const kycMeta =
    kycDetail && typeof kycDetail === 'object'
      ? (kycDetail as Record<string, unknown>)
      : null

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description="Full investor profile — KYC, wallet, ledger activity, and operator controls."
        eyebrow={
          <Link href={ROUTES.admin.users} className="hover:text-fg">
            ← Users
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminKycPill status={kycStatus} />
            <AdminAccountPill status={accountStatus} />
            {user.status === ('SUSPENDED' satisfies UserStatus) || user.status === 'BLOCKED' ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={enable.isPending}
                onClick={() => enable.mutate()}
              >
                <CheckCircle2 aria-hidden />
                Activate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="danger"
                disabled={suspend.isPending}
                onClick={() => suspend.mutate()}
              >
                <Ban aria-hidden />
                Suspend
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Admin Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Wallet balance',
                node: <Money value={available} size="md" />,
              },
              {
                label: 'Locked balance',
                node: (
                  <Money
                    value={(walletRow?.lockedBalance ?? '0.00') as MoneyString}
                    size="md"
                  />
                ),
              },
              {
                label: 'Ledger balance',
                node: <Money value={(walletRow?.balance ?? '0.00') as MoneyString} size="md" />,
              },
              {
                label: 'Email verified',
                node: (
                  <p className="text-body-sm font-medium text-fg">
                    {user.emailVerified ? 'Yes' : 'No'}
                  </p>
                ),
              },
            ].map((s) => (
              <AdminPanel key={s.label} className="p-4" glow>
                <p className="text-caption text-fg-muted">{s.label}</p>
                <div className="mt-2">{s.node}</div>
              </AdminPanel>
            ))}
          </div>

          <AdminPanel>
            <AdminPanelHeader title="Personal details" />
            <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              {[
                ['User ID', user.id],
                ['Username', `@${username}`],
                ['Email', user.email],
                ['Phone', user.phone ?? '—'],
                ['Country', user.country ?? '—'],
                ['Timezone', user.timezone],
                ['Role', user.role],
                ['Registered', formatDateTime(user.createdAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-fg-subtle">{k}</dt>
                  <dd className="mt-0.5 text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-5">
          <AdminPanel className="space-y-5 p-4 sm:p-5" glow>
            <SectionHeader
              title="Identity documents"
              description="Review documents stored via the production KYC API."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <DocPanel label="Front ID" accent="from-accent-500/35 via-info/20 to-transparent" />
              <DocPanel label="Back ID" accent="from-info/30 via-accent-500/15 to-transparent" />
              <DocPanel label="Selfie" accent="from-warning/25 via-accent-500/20 to-transparent" />
            </div>
            <dl className="grid gap-3 text-caption sm:grid-cols-3">
              <div>
                <dt className="text-fg-subtle">KYC status</dt>
                <dd className="mt-1">
                  <AdminKycPill status={kycStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Account</dt>
                <dd className="mt-1">
                  <AdminAccountPill status={accountStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">API payload</dt>
                <dd className="mt-0.5 text-fg-muted">
                  {kycMeta ? 'Loaded' : 'No KYC submission yet'}
                </dd>
              </div>
            </dl>
            {(kycStatus === 'UNDER_REVIEW' || kycStatus === 'REJECTED') && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={approveKyc.isPending}
                  onClick={() => approveKyc.mutate()}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={rejectKyc.isPending}
                  onClick={() => {
                    const reason = window.prompt('Rejection reason') || 'Documents rejected'
                    rejectKyc.mutate(reason)
                  }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={requestInfo.isPending}
                  onClick={() => {
                    const reason =
                      window.prompt('Resubmission note') || 'Please resubmit documents'
                    requestInfo.mutate(reason)
                  }}
                >
                  Request resubmit
                </Button>
              </div>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="deposits">
          <AdminPanel>
            <AdminPanelHeader
              title="Deposits"
              description={`${deposits.length} record${deposits.length === 1 ? '' : 's'}`}
            />
            {deposits.length === 0 ? (
              <EmptyState title="No deposits" description="This investor has not submitted deposits." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {deposits.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-fg-muted">{d.id}</p>
                      <p className="text-fg">
                        {methodLabel(d.method)} · {d.reference}
                      </p>
                      <p className="text-fg-subtle">{formatDateTime(d.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AdminDepositPill status={mapDepositStatus(d.status)} />
                      <Money value={d.amount as MoneyString} size="sm" />
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.deposit(d.id)}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="withdrawals">
          <AdminPanel>
            <AdminPanelHeader
              title="Withdrawals"
              description={`${withdrawals.length} record${withdrawals.length === 1 ? '' : 's'}`}
            />
            {withdrawals.length === 0 ? (
              <EmptyState
                title="No withdrawals"
                description="This investor has not requested withdrawals."
              />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {withdrawals.map((w) => (
                  <li
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-fg-muted">{w.id}</p>
                      <p className="text-fg">{w.destinationLabel}</p>
                      <p className="text-fg-subtle">{formatDateTime(w.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AdminWithdrawalPill status={mapWithdrawalStatus(w.status)} />
                      <Money value={w.amount as MoneyString} size="sm" />
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.withdrawal(w.id)}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="wallet">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Available balance', value: available },
              {
                label: 'Locked balance',
                value: (walletRow?.lockedBalance ?? '0.00') as MoneyString,
              },
              { label: 'Ledger balance', value: (walletRow?.balance ?? '0.00') as MoneyString },
            ].map((s) => (
              <AdminPanel key={s.label} className="p-4 sm:p-5" glow>
                <p className="text-caption text-fg-muted">{s.label}</p>
                <div className="mt-2">
                  <Money value={s.value} size="md" />
                </div>
              </AdminPanel>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="returns">
          <AdminPanel>
            <AdminPanelHeader
              title="Return history"
              description="Platform daily return runs (global). Investor-specific ledgers live in performance API."
            />
            {!showMarketLists || returns.length === 0 ? (
              <EmptyState
                title="No returns yet"
                description="Returns appear after the investor is verified and eligible."
              />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {returns.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div>
                      <p className="font-medium text-fg">{r.date}</p>
                      <p className="text-fg-subtle">
                        {r.status} · {r.processedWallets}/{r.eligibleWallets} wallets
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-profit">+{r.returnPct}%</p>
                      <Money
                        value={r.totalDistributed as MoneyString}
                        size="sm"
                        className="text-fg-muted"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="trades">
          <AdminPanel>
            <AdminPanelHeader title="Trade history" description="Published platform trades from API." />
            {!showMarketLists || trades.length === 0 ? (
              <EmptyState title="No trades" description="Trades unlock after verification." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {trades.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div>
                      <p className="font-medium text-fg">
                        {t.pair}{' '}
                        <span className={t.direction === 'BUY' ? 'text-profit' : 'text-loss'}>
                          {t.direction}
                        </span>
                      </p>
                      <p className="text-fg-subtle">
                        {t.date} · {t.entryPrice} → {t.exitPrice}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-profit">+{t.returnPct}%</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="notifications">
          <AdminPanel>
            <AdminPanelHeader
              title="Notifications"
              description="Investor notification inbox is API-backed per user; open the investor app to inspect."
            />
            <EmptyState
              title="No operator notification feed"
              description="Use Broadcasts / Email Center for outbound messages."
            />
          </AdminPanel>
        </TabsContent>

        <TabsContent value="security">
          <AdminPanel>
            <AdminPanelHeader title="Security" description="Account verification state from API." />
            <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              <div>
                <dt className="text-fg-subtle">Email verified</dt>
                <dd className="mt-0.5 text-fg">{user.emailVerified ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Status</dt>
                <dd className="mt-0.5 text-fg">{user.status}</dd>
              </div>
            </dl>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <AdminPanel>
            <AdminPanelHeader
              title="Account timeline"
              description="Platform activity feed filtered for this user when possible."
            />
            <ol className="relative ml-5 space-y-0 border-l border-white/10 py-2">
              {(timeline.length
                ? timeline
                : [
                    {
                      id: 'fallback',
                      at: user.createdAt,
                      title: 'Account created',
                      kind: 'ACCOUNT_CREATED',
                    },
                  ]
              ).map((e) => (
                <li key={e.id} className="relative pb-5 pl-6 last:pb-2">
                  <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent-400 ring-4 ring-base" />
                  <p className="text-body-sm font-medium text-fg">{e.title}</p>
                  <p className="text-caption text-fg-muted">{e.kind}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-fg-subtle">
                    {formatDateTime(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <AdminPanel className="space-y-4 p-4 sm:p-5">
            <SectionHeader
              title="Admin notes"
              description="Internal notes require a dedicated API endpoint — drafts are not stored in the browser."
            />
            <p className="text-caption text-fg-muted">No persisted notes API yet.</p>
            <FormField label="Draft note (not saved)">
              <Textarea
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add an internal note…"
                className="border-white/10 bg-white/[0.04]"
              />
            </FormField>
            <Button
              size="sm"
              disabled={!noteDraft.trim()}
              onClick={() => {
                toast.error('Admin notes API is not available — nothing was saved')
              }}
            >
              Add note
            </Button>
          </AdminPanel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
