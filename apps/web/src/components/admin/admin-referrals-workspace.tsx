'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Search, Sparkles } from 'lucide-react'

import { AdminListPagination } from '@/components/admin/admin-list-pagination'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAdminReferralRelationships,
  useAdminReferralReward,
  useAdminReferralRewards,
  useAdminReferralSummary,
} from '@/features/admin/hooks'
import { formatDate, formatDateTime, formatPercent } from '@/lib/format'
import type { AdminReferralRewardRow } from '@/services/admin.service'

type StatusFilter = 'ALL' | 'LOCKED' | 'AVAILABLE' | 'REDEEMED' | 'CANCELLED'
type MainTab = 'rewards' | 'relationships'

function personName(p: { firstName: string; lastName: string; email: string }) {
  const name = `${p.firstName} ${p.lastName}`.trim()
  return name || p.email
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 sm:px-4">
      <p className="text-caption text-fg-subtle">{label}</p>
      <div className="mt-1 text-body-sm font-medium text-fg">{value}</div>
    </div>
  )
}

function RewardDetailSheet({
  rewardId,
  onClose,
}: {
  rewardId: string | null
  onClose: () => void
}) {
  const detail = useAdminReferralReward(rewardId)
  const row = detail.data

  return (
    <Sheet open={Boolean(rewardId)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Referral reward</SheetTitle>
          <SheetDescription>
            Source deposit and reward are separate ledger events. Redemption is investor-only.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {detail.isLoading || !row ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusPill status={row.status} />
                <p className="text-caption text-fg-subtle">{formatDateTime(row.createdAt)}</p>
              </div>

              <section className="rounded-xl border border-white/[0.08] p-3.5">
                <h3 className="text-caption font-medium text-fg-subtle">Source deposit</h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-caption">
                  <div>
                    <dt className="text-fg-subtle">Reference</dt>
                    <dd className="mt-0.5 font-mono text-fg">{row.sourceDeposit.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Deposit amount</dt>
                    <dd className="mt-0.5">
                      <Money value={row.sourceDeposit.amount} size="sm" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Deposit status</dt>
                    <dd className="mt-0.5 text-fg">{row.sourceDeposit.status}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Reward basis amount</dt>
                    <dd className="mt-0.5">
                      <Money value={row.sourceAmount} size="sm" />
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-xl border border-accent-500/20 bg-accent-500/[0.04] p-3.5">
                <h3 className="text-caption font-medium text-fg-subtle">Referral reward</h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-caption">
                  <div>
                    <dt className="text-fg-subtle">Commission applied</dt>
                    <dd className="mt-0.5 text-fg">
                      {formatPercent(row.percentApplied, { signed: false, decimals: 2 })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Reward amount</dt>
                    <dd className="mt-0.5">
                      <Money value={row.rewardAmount} size="sm" className="text-profit" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Unlock date</dt>
                    <dd className="mt-0.5 text-fg">{formatDate(row.unlockAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Redeemed</dt>
                    <dd className="mt-0.5 text-fg">
                      {row.redeemedAt ? formatDateTime(row.redeemedAt) : '—'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-2 text-caption">
                <p>
                  <span className="text-fg-subtle">Referrer · </span>
                  <span className="text-fg">{personName(row.referrer)}</span>
                  <span className="text-fg-muted"> · {row.referrer.email}</span>
                </p>
                <p>
                  <span className="text-fg-subtle">Referred · </span>
                  <span className="text-fg">{personName(row.referee)}</span>
                  <span className="text-fg-muted"> · {row.referee.email}</span>
                </p>
                <p className="break-all">
                  <span className="text-fg-subtle">Credit txn · </span>
                  <span className="font-mono text-fg">{row.creditedTransactionId ?? '—'}</span>
                </p>
                <p className="break-all">
                  <span className="text-fg-subtle">Redeem txn · </span>
                  <span className="font-mono text-fg">{row.redeemedTransactionId ?? '—'}</span>
                </p>
              </section>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function RewardCard({
  row,
  onOpen,
}: {
  row: AdminReferralRewardRow
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-left transition hover:bg-white/[0.04]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption text-fg-subtle">{formatDateTime(row.createdAt)}</p>
          <p className="mt-1 text-body-sm text-fg">
            {personName(row.referrer)} ← {personName(row.referee)}
          </p>
        </div>
        <StatusPill status={row.status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-caption">
        <div>
          <dt className="text-fg-subtle">Deposit</dt>
          <dd className="mt-0.5">
            <Money value={row.sourceAmount} size="sm" />
          </dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Reward</dt>
          <dd className="mt-0.5">
            <Money value={row.rewardAmount} size="sm" className="text-profit" />
          </dd>
        </div>
        <div>
          <dt className="text-fg-subtle">%</dt>
          <dd className="mt-0.5 text-fg">
            {formatPercent(row.percentApplied, { signed: false, decimals: 2 })}
          </dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Unlock</dt>
          <dd className="mt-0.5 text-fg">{formatDate(row.unlockAt)}</dd>
        </div>
      </dl>
    </button>
  )
}

export function AdminReferralsWorkspace() {
  const [mainTab, setMainTab] = useState<MainTab>('rewards')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [relPage, setRelPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const summary = useAdminReferralSummary()
  const rewardsQuery = useAdminReferralRewards(
    {
      q: appliedQ || undefined,
      status: status === 'ALL' ? undefined : status,
      from: from || undefined,
      to: to || undefined,
      page,
      limit: 20,
    },
    { enabled: mainTab === 'rewards' },
  )
  const relationshipsQuery = useAdminReferralRelationships(
    {
      q: appliedQ || undefined,
      from: from || undefined,
      to: to || undefined,
      page: relPage,
      limit: 20,
    },
    { enabled: mainTab === 'relationships' },
  )

  const metrics = summary.data

  const statusTabs = useMemo(
    () =>
      (['ALL', 'LOCKED', 'AVAILABLE', 'REDEEMED', 'CANCELLED'] as const).map((s) => ({
        value: s,
        label: s === 'ALL' ? 'All' : s.toLowerCase(),
      })),
    [],
  )

  function applySearch() {
    setAppliedQ(search.trim())
    setPage(1)
    setRelPage(1)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Referrals"
        description="Programme overview, relationships, and reward ledger. Investors redeem rewards; admins view only."
      />

      {metrics && !metrics.referralEnabled ? (
        <Alert tone="warning" title="Referral programme is OFF">
          Settings remain editable under Platform settings. Turning the programme on does not rewrite
          existing rewards.
        </Alert>
      ) : null}

      <AdminPanel>
        <AdminPanelHeader title="Overview" description="Live aggregates from referral rewards." />
        {summary.isLoading ? (
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-xl" />
            ))}
          </div>
        ) : summary.error || !metrics ? (
          <div className="p-4 sm:p-5">
            <Alert tone="danger" title="Could not load referral overview">
              Refresh and try again.
            </Alert>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:gap-3 sm:p-5">
            <MetricCard label="Total rewards" value={metrics.rewardCount} />
            <MetricCard
              label="Total reward amount"
              value={<Money value={metrics.totalRewardAmount} size="sm" />}
            />
            <MetricCard
              label="Locked"
              value={<Money value={metrics.lockedAmount} size="sm" className="text-warning" />}
            />
            <MetricCard
              label="Available"
              value={<Money value={metrics.availableAmount} size="sm" className="text-profit" />}
            />
            <MetricCard
              label="Redeemed"
              value={<Money value={metrics.redeemedAmount} size="sm" className="text-info" />}
            />
            <MetricCard label="Relationships" value={metrics.relationshipCount} />
            <MetricCard label="Referred users" value={metrics.referredUserCount} />
            <MetricCard label="Referral deposits" value={metrics.referralDepositCount} />
          </div>
        )}
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Filters"
          description="Server-side search across referrer, referred user, code, and deposit reference."
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <FormField label="Search" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, code, deposit ref…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch()
                }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={applySearch}>
                <Search aria-hidden />
                Search
              </Button>
            </div>
          </FormField>
          <FormField label="From">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(1)
                setRelPage(1)
              }}
            />
          </FormField>
          <FormField label="To">
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(1)
                setRelPage(1)
              }}
            />
          </FormField>
        </div>
      </AdminPanel>

      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as MainTab)}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="rewards">Reward ledger</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        {mainTab === 'rewards' ? (
          <AdminPanel>
            <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] px-3 py-3 sm:px-4">
              {statusTabs.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={status === t.value ? 'secondary' : 'ghost'}
                  className="capitalize"
                  onClick={() => {
                    setStatus(t.value)
                    setPage(1)
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            {rewardsQuery.isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            ) : rewardsQuery.error ? (
              <div className="p-4">
                <Alert tone="danger" title="Could not load rewards">
                  Refresh and try again.
                </Alert>
              </div>
            ) : (rewardsQuery.data?.items.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <Sparkles className="size-5 text-fg-subtle" aria-hidden />
                <p className="text-body-sm text-fg">No referral rewards match</p>
                <p className="text-caption text-fg-muted">
                  Rewards appear when a referred user&apos;s deposit is approved and the programme is
                  enabled.
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-3 p-3 md:hidden">
                  {rewardsQuery.data!.items.map((row) => (
                    <li key={row.id}>
                      <RewardCard row={row} onOpen={setSelectedId} />
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[960px] text-left text-caption">
                    <thead className="border-b border-white/[0.06] text-fg-subtle">
                      <tr>
                        <th className="px-4 py-3 font-medium">Created</th>
                        <th className="px-4 py-3 font-medium">Referrer</th>
                        <th className="px-4 py-3 font-medium">Referred</th>
                        <th className="px-4 py-3 font-medium">Deposit</th>
                        <th className="px-4 py-3 font-medium">%</th>
                        <th className="px-4 py-3 font-medium">Reward</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Unlock</th>
                        <th className="px-4 py-3 font-medium">Redeemed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rewardsQuery.data!.items.map((row) => (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.03]"
                          onClick={() => setSelectedId(row.id)}
                        >
                          <td className="px-4 py-3 text-fg-muted">{formatDateTime(row.createdAt)}</td>
                          <td className="px-4 py-3">
                            <p className="text-fg">{personName(row.referrer)}</p>
                            <p className="text-fg-subtle">{row.referrer.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-fg">{personName(row.referee)}</p>
                            <p className="text-fg-subtle">{row.referee.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-mono text-fg">{row.sourceDeposit.reference}</p>
                            <Money value={row.sourceAmount} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-fg-muted">
                            {formatPercent(row.percentApplied, { signed: false, decimals: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <Money value={row.rewardAmount} size="sm" className="text-profit" />
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-fg-muted">{formatDate(row.unlockAt)}</td>
                          <td className="px-4 py-3 text-fg-muted">
                            {row.redeemedAt ? formatDate(row.redeemedAt) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AdminListPagination
                  pagination={rewardsQuery.data?.pagination}
                  onPageChange={setPage}
                />
              </>
            )}
          </AdminPanel>
        ) : (
          <AdminPanel>
            {relationshipsQuery.isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ) : relationshipsQuery.error ? (
              <div className="p-4">
                <Alert tone="danger" title="Could not load relationships">
                  Refresh and try again.
                </Alert>
              </div>
            ) : (relationshipsQuery.data?.items.length ?? 0) === 0 ? (
              <div className="px-4 py-12 text-center text-caption text-fg-muted">
                No referral relationships found.
              </div>
            ) : (
              <>
                <ul className="divide-y divide-white/[0.06] md:hidden">
                  {relationshipsQuery.data!.items.map((row) => (
                    <li key={row.id} className="space-y-2 px-4 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-body-sm text-fg">{personName(row.referredUser)}</p>
                        <StatusPill status={row.status} />
                      </div>
                      <p className="text-caption text-fg-muted">{row.referredUser.email}</p>
                      <p className="text-caption text-fg-subtle">
                        Referred by{' '}
                        {row.referrer
                          ? `${personName(row.referrer)} (${row.referrer.referralCode ?? '—'})`
                          : '—'}
                      </p>
                      <p className="text-caption text-fg-muted">
                        Registered {formatDate(row.referredUser.registeredAt)} ·{' '}
                        {row.depositCount} deposits ·{' '}
                        <Money value={row.totalGeneratedReward} size="sm" className="inline" /> rewards
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[880px] text-left text-caption">
                    <thead className="border-b border-white/[0.06] text-fg-subtle">
                      <tr>
                        <th className="px-4 py-3 font-medium">Referrer</th>
                        <th className="px-4 py-3 font-medium">Code</th>
                        <th className="px-4 py-3 font-medium">Referred user</th>
                        <th className="px-4 py-3 font-medium">Registered</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Deposits</th>
                        <th className="px-4 py-3 font-medium">Rewards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relationshipsQuery.data!.items.map((row) => (
                        <tr key={row.id} className="border-b border-white/[0.04]">
                          <td className="px-4 py-3">
                            {row.referrer ? (
                              <>
                                <p className="text-fg">{personName(row.referrer)}</p>
                                <p className="text-fg-subtle">{row.referrer.email}</p>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-fg">
                            {row.referrer?.referralCode ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-fg">{personName(row.referredUser)}</p>
                            <p className="text-fg-subtle">{row.referredUser.email}</p>
                          </td>
                          <td className="px-4 py-3 text-fg-muted">
                            {formatDate(row.referredUser.registeredAt)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-fg">{row.depositCount}</td>
                          <td className="px-4 py-3">
                            <Money value={row.totalGeneratedReward} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AdminListPagination
                  pagination={relationshipsQuery.data?.pagination}
                  onPageChange={setRelPage}
                />
              </>
            )}
          </AdminPanel>
        )}
      </Tabs>

      <RewardDetailSheet rewardId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
