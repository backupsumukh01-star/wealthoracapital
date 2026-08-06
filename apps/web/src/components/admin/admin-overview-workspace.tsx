'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ROUTES } from '@meridian/shared'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Database,
  HardDrive,
  HeartPulse,
  Mail,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import {
  useAdminHealth,
  useAdminOpsDashboard,
  useReviewDeposit,
  useReviewWithdrawal,
  adminQueryKeys,
} from '@/features/admin/hooks'
import { formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useQueryClient } from '@tanstack/react-query'

const QUICK_ACTIONS = [
  {
    label: 'Approve Pending Deposits',
    href: `${ROUTES.admin.deposits}?status=PENDING`,
    icon: ArrowDownRight,
  },
  {
    label: 'Approve Pending Withdrawals',
    href: `${ROUTES.admin.withdrawals}?status=PENDING`,
    icon: ArrowUpRight,
  },
  { label: 'Review Pending KYC', href: ROUTES.admin.kyc, icon: ShieldCheck },
  { label: 'Publish Daily Return', href: ROUTES.admin.dailyReturn, icon: TrendingUp },
  { label: 'Manage Users', href: ROUTES.admin.users, icon: Users },
  { label: 'View Notifications', href: ROUTES.admin.notifications, icon: Bell },
  { label: 'System Health', href: ROUTES.admin.systemHealth, icon: HeartPulse },
] as const

const PERIOD_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  month: 'This Month',
  all: 'Lifetime',
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#0c1219]/95 px-3 py-2 text-caption shadow-e3 backdrop-blur-xl">
      <p className="text-fg-subtle">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 tabular-nums text-fg" style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString('en-US')}
        </p>
      ))}
    </div>
  )
}

function LiveCard({
  label,
  count,
  amount,
  changePct,
  href,
}: {
  label: string
  count: number
  amount: string | null
  changePct: number
  href: string
}) {
  const up = changePct >= 0
  return (
    <Link
      href={href}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border border-white/[0.08]',
        'bg-white/[0.03] p-4 backdrop-blur-xl transition-all duration-200',
        'hover:border-accent-500/35 hover:bg-white/[0.055] hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]',
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-fg sm:text-3xl">
        {count.toLocaleString('en-US')}
      </p>
      {amount != null ? (
        <p className="mt-1 text-sm tabular-nums text-fg-muted">
          <Money value={amount} />
        </p>
      ) : null}
      <p
        className={cn(
          'mt-3 inline-flex items-center gap-1 text-[11px] font-medium tabular-nums',
          up ? 'text-emerald-400' : 'text-rose-400',
        )}
      >
        {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
        {up ? '+' : ''}
        {changePct}% vs yesterday
      </p>
    </Link>
  )
}

function HealthPill({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean
  detail?: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span
        className={cn('size-2 shrink-0 rounded-full', ok ? 'bg-emerald-400' : 'bg-rose-400')}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="truncate text-caption font-medium text-fg">{label}</p>
        {detail ? <p className="truncate text-[10px] text-fg-subtle">{detail}</p> : null}
      </div>
    </div>
  )
}

export function AdminOverviewWorkspace() {
  const queryClient = useQueryClient()
  const { data, isLoading, dataUpdatedAt, isFetching } = useAdminOpsDashboard()
  const { data: health } = useAdminHealth()
  const reviewDeposit = useReviewDeposit()
  const reviewWithdrawal = useReviewWithdrawal()
  const [period, setPeriod] = useState('today')
  const [busyId, setBusyId] = useState<string | null>(null)

  const periods = data?.periods ?? {}
  const selected = periods[period] ?? periods.today
  const charts = data?.charts
  const totals = data?.totals
  const pending = data?.pending

  const walletChart = useMemo(() => {
    if (!totals?.wallets) return []
    return [
      { name: 'Available', value: Number(totals.wallets.available) || 0 },
      { name: 'Locked', value: Number(totals.wallets.locked) || 0 },
      { name: 'Invested', value: Number(totals.wallets.invested) || 0 },
    ]
  }, [totals])

  async function onDepositDecision(id: string, decision: 'APPROVE' | 'REJECT') {
    setBusyId(id)
    try {
      await reviewDeposit.mutateAsync({ id, decision })
      toast.success(decision === 'APPROVE' ? 'Deposit approved' : 'Deposit rejected')
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setBusyId(null)
    }
  }

  async function onWithdrawalDecision(id: string, decision: 'APPROVE' | 'REJECT') {
    setBusyId(id)
    try {
      await reviewWithdrawal.mutateAsync({ id, decision })
      toast.success(decision === 'APPROVE' ? 'Withdrawal approved' : 'Withdrawal rejected')
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setBusyId(null)
    }
  }

  const w = health?.widgets
  const apiOk = w?.api?.status === 'ok' || w?.api?.status === 'up' || Boolean(w?.api)
  const dbOk = w?.database?.status === 'up'
  const redisOk = w?.redis?.status === 'up' || w?.redis?.status === 'disabled'
  const storageOk = w?.storage?.status === 'up' || w?.storage?.status === 'disabled'
  const mailOk = (w?.emailQueue?.failed ?? 0) === 0
  const queueOk = (w?.queue?.failed ?? 0) < 5

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Operations Dashboard"
        description="Live platform pulse — deposits, withdrawals, KYC, and settlement in one place."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                isFetching
                  ? 'border-amber-500/30 text-amber-300'
                  : 'border-emerald-500/30 text-emerald-300',
              )}
            >
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              {isFetching ? 'Refreshing…' : 'Live · 15s'}
            </span>
            {dataUpdatedAt ? (
              <span className="hidden sm:inline">
                Updated {formatDateTime(new Date(dataUpdatedAt).toISOString())}
              </span>
            ) : null}
          </div>
        }
      />

      {/* Quick actions — sticky on desktop */}
      <div className="sticky top-[calc(var(--topbar-height)+env(safe-area-inset-top,0px)+0.5rem)] z-20 -mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2 rounded-2xl border border-white/[0.08] bg-[#0a1017]/85 p-2 backdrop-blur-xl sm:min-w-0 sm:flex-wrap">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Button key={action.href} asChild variant="glass" size="sm" className="shrink-0">
                <Link href={action.href}>
                  <Icon className="size-3.5" aria-hidden />
                  {action.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Section 1 — Live overview cards */}
      <section>
        <h2 className="mb-3 text-overline text-fg-subtle">Live overview</h2>
        {isLoading && !data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(data?.liveCards ?? []).map((card) => (
              <LiveCard key={card.id} {...card} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Section 4 — Pending approvals */}
        <section className="space-y-4">
          <AdminPanel glow>
            <AdminPanelHeader
              title="Pending deposits"
              description="Approve or reject without leaving the dashboard"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.admin.deposits}>View all</Link>
                </Button>
              }
            />
            <div className="divide-y divide-white/[0.05]">
              {(pending?.deposits ?? []).length === 0 ? (
                <p className="px-4 py-8 text-center text-caption text-fg-muted sm:px-5">
                  No pending deposits
                </p>
              ) : (
                pending!.deposits.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{row.user.name}</p>
                      <p className="mt-0.5 text-caption text-fg-muted">
                        <Money value={row.amount} /> · {row.coin ?? row.method}
                        {row.network ? ` · ${row.network}` : ''} ·{' '}
                        {formatDateTime(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => void onDepositDecision(row.id, 'APPROVE')}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === row.id}
                        onClick={() => void onDepositDecision(row.id, 'REJECT')}
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.deposit(row.id)}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader
              title="Pending withdrawals"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.admin.withdrawals}>View all</Link>
                </Button>
              }
            />
            <div className="divide-y divide-white/[0.05]">
              {(pending?.withdrawals ?? []).length === 0 ? (
                <p className="px-4 py-8 text-center text-caption text-fg-muted sm:px-5">
                  No pending withdrawals
                </p>
              ) : (
                pending!.withdrawals.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{row.user.name}</p>
                      <p className="mt-0.5 text-caption text-fg-muted">
                        <Money value={row.amount} /> · {row.method} ·{' '}
                        {formatDateTime(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => void onWithdrawalDecision(row.id, 'APPROVE')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === row.id}
                        onClick={() => void onWithdrawalDecision(row.id, 'REJECT')}
                      >
                        Reject
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.withdrawal(row.id)}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader
              title="Pending KYC"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.admin.kyc}>Queue</Link>
                </Button>
              }
            />
            <div className="divide-y divide-white/[0.05]">
              {(pending?.kyc ?? []).length === 0 ? (
                <p className="px-4 py-8 text-center text-caption text-fg-muted sm:px-5">
                  No KYC awaiting review
                </p>
              ) : (
                pending!.kyc.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{row.user.name}</p>
                      <p className="mt-0.5 text-caption text-fg-muted">
                        {row.country || '—'} · Submitted {formatDateTime(row.submittedAt)}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={ROUTES.admin.kycReview(row.userId)}>Open review</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </section>

        {/* Section 3 — Live activity */}
        <section>
          <AdminPanel className="h-full" glow>
            <AdminPanelHeader
              title="Live activity"
              description="Newest first · auto-refresh"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.admin.activity}>
                    <Activity className="size-3.5" />
                    Full feed
                  </Link>
                </Button>
              }
            />
            <ul className="max-h-[42rem] space-y-0 overflow-y-auto px-4 py-2 sm:px-5">
              {(data?.activity ?? []).length === 0 ? (
                <li className="py-10 text-center text-caption text-fg-muted">No recent activity</li>
              ) : (
                (data?.activity ?? []).map((item) => (
                  <li
                    key={item.id}
                    className="relative border-b border-white/[0.04] py-3 last:border-0"
                  >
                    <p className="text-[11px] tabular-nums text-fg-subtle">
                      {formatDateTime(item.at)}
                    </p>
                    <p className="mt-0.5 text-body-sm font-medium text-fg">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-caption text-fg-muted">
                        {item.description}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </AdminPanel>
        </section>
      </div>

      {/* Section 5 — Financial summary */}
      <section>
        <AdminPanel glow>
          <AdminPanelHeader title="Financial summary" description="Period totals from live ledger" />
          <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
            {Object.keys(PERIOD_LABELS).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-caption font-medium transition-colors',
                  period === key
                    ? 'bg-accent-500/20 text-accent-200'
                    : 'text-fg-muted hover:bg-white/[0.04] hover:text-fg',
                )}
              >
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>
          {selected ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
              {[
                { label: 'Deposits', value: selected.deposits, hint: `${selected.depositsCount} approved` },
                {
                  label: 'Withdrawals',
                  value: selected.withdrawals,
                  hint: `${selected.withdrawalsCount} paid`,
                },
                { label: 'Profit distributed', value: selected.profitDistributed },
                { label: 'Platform balance', value: selected.platformBalance },
                { label: 'Active investments', value: selected.activeInvestments },
                {
                  label: 'Pending deposits',
                  value: String(selected.pendingDeposits),
                  isCount: true,
                },
                {
                  label: 'Pending withdrawals',
                  value: String(selected.pendingWithdrawals),
                  isCount: true,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <p className="text-[11px] text-fg-muted">{m.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
                    {'isCount' in m && m.isCount ? (
                      m.value
                    ) : (
                      <Money value={m.value} />
                    )}
                  </p>
                  {'hint' in m && m.hint ? (
                    <p className="mt-0.5 text-[10px] text-fg-subtle">{m.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </AdminPanel>
      </section>

      {/* Section 6 — Analytics */}
      <section className="grid gap-4 lg:grid-cols-2">
        <AdminPanel>
          <AdminPanelHeader title="Deposits per day" />
          <div className="h-56 p-4 pt-0 sm:p-5 sm:pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.depositsPerDay ?? []}>
                <defs>
                  <linearGradient id="depFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} width={48} />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Deposits"
                  stroke="#34d399"
                  fill="url(#depFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Withdrawals per day" />
          <div className="h-56 p-4 pt-0 sm:p-5 sm:pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.withdrawalsPerDay ?? []}>
                <defs>
                  <linearGradient id="wdrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} width={48} />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Withdrawals"
                  stroke="#f87171"
                  fill="url(#wdrFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="New users" />
          <div className="h-56 p-4 pt-0 sm:p-5 sm:pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.newUsers ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} width={32} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Users" fill="#60a5fa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Profit distributed" />
          <div className="h-56 p-4 pt-0 sm:p-5 sm:pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.profitDistributed ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} width={48} />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Profit"
                  stroke="#a78bfa"
                  fill="rgba(167,139,250,0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="KYC approvals" />
          <div className="h-56 p-4 pt-0 sm:p-5 sm:pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.kycApprovals ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} width={32} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Approvals" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader title="Wallet balances" description="Platform investment wallets" />
          <div className="h-56 p-4 pt-0 sm:p-5 sm:pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={walletChart} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#8b9cb3', fontSize: 11 }} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#8b9cb3', fontSize: 11 }}
                  axisLine={false}
                  width={72}
                />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Balance" fill="#fbbf24" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>
      </section>

      {/* Lifetime report strip + system health */}
      <section className="grid gap-4 lg:grid-cols-2">
        <AdminPanel>
          <AdminPanelHeader
            title="Platform totals"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.admin.reports}>Financial reports</Link>
              </Button>
            }
          />
          {totals ? (
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-5">
              {[
                { label: 'Total users', value: totals.users.total },
                { label: 'Verified', value: totals.users.verified },
                { label: 'Active', value: totals.users.active },
                { label: 'Suspended', value: totals.users.suspended },
                { label: 'Deleted', value: totals.users.deleted },
                { label: 'Pending KYC', value: totals.kyc.pending },
                { label: 'Approved deposits', value: totals.deposits.approved },
                { label: 'Pending deposits', value: totals.deposits.pending },
                { label: 'Rejected deposits', value: totals.deposits.rejected },
                { label: 'Paid withdrawals', value: totals.withdrawals.paid },
                { label: 'Pending withdrawals', value: totals.withdrawals.pending },
                { label: 'Rejected withdrawals', value: totals.withdrawals.rejected },
              ].map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <p className="text-[10px] text-fg-subtle">{row.label}</p>
                  <p className="text-body-sm font-semibold tabular-nums text-fg">
                    {row.value.toLocaleString('en-US')}
                  </p>
                </div>
              ))}
              <div className="col-span-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 sm:col-span-3">
                <p className="text-[10px] text-fg-subtle">
                  Profit · day / month / lifetime
                  {totals.profit.lifetimeCount != null
                    ? ` · ${totals.profit.lifetimeCount.toLocaleString('en-US')} credits`
                    : ''}
                </p>
                <p className="mt-1 text-body-sm font-semibold tabular-nums text-fg">
                  {formatMoney(totals.profit.daily)} · {formatMoney(totals.profit.monthly)} ·{' '}
                  {formatMoney(totals.profit.lifetime)}
                </p>
              </div>
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader
            title="System health"
            description={
              health
                ? `v${health.version} · uptime ${Math.floor((health.uptimeSeconds ?? 0) / 3600)}h`
                : 'Checking…'
            }
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.admin.systemHealth}>Details</Link>
              </Button>
            }
          />
          <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
            <HealthPill
              label="API"
              ok={apiOk}
              detail={w?.api ? `Node ${w.api.node}` : undefined}
            />
            <HealthPill
              label="Database"
              ok={dbOk}
              detail={w?.database?.latencyMs != null ? `${w.database.latencyMs}ms` : undefined}
            />
            <HealthPill
              label="Redis"
              ok={redisOk}
              detail={w?.redis?.status}
            />
            <HealthPill
              label="Queue"
              ok={queueOk}
              detail={`${w?.queue?.waiting ?? 0} waiting · ${w?.queue?.failed ?? 0} failed`}
            />
            <HealthPill
              label="Mail"
              ok={mailOk}
              detail={`${w?.emailQueue?.sentToday ?? 0} sent today`}
            />
            <HealthPill label="Storage" ok={storageOk} detail={w?.storage?.driver} />
            <HealthPill
              label="CPU"
              ok={(w?.cpu?.load1 ?? 0) < (w?.cpu?.cores ?? 1) * 2}
              detail={w?.cpu ? `load ${w.cpu.load1.toFixed(2)}` : undefined}
            />
            <HealthPill
              label="Memory"
              ok={(w?.memory?.systemUsedPct ?? 0) < 90}
              detail={
                w?.memory
                  ? `${w.memory.systemUsedPct.toFixed(0)}% · RSS ${w.memory.processRssMb}MB`
                  : undefined
              }
            />
            <HealthPill
              label="Disk"
              ok={(w?.stability?.diskUsedPct ?? 0) < 90}
              detail={
                w?.stability?.diskUsedPct != null
                  ? `${w.stability.diskUsedPct.toFixed(0)}% used`
                  : 'n/a'
              }
            />
            <HealthPill
              label="Workers"
              ok={(w?.stability?.backgroundJobs ?? []).every((j) => j.consecutiveFailures === 0)}
              detail={`${w?.stability?.backgroundJobs?.length ?? 0} jobs`}
            />
            <HealthPill
              label="Last backup"
              ok
              detail={w?.stability?.lastDeployment?.slice(0, 19) ?? '—'}
            />
            <HealthPill label="Version" ok detail={health?.version ?? '—'} />
          </div>
          <div className="flex flex-wrap gap-3 border-t border-white/[0.06] px-4 py-3 text-[11px] text-fg-subtle sm:px-5">
            <span className="inline-flex items-center gap-1">
              <Server className="size-3" /> API
            </span>
            <span className="inline-flex items-center gap-1">
              <Database className="size-3" /> DB
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3" /> Mail
            </span>
            <span className="inline-flex items-center gap-1">
              <HardDrive className="size-3" /> Storage
            </span>
            <span className="inline-flex items-center gap-1">
              <Wallet className="size-3" /> Wallets
            </span>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="size-3" /> KYC
            </span>
          </div>
        </AdminPanel>
      </section>
    </div>
  )
}
