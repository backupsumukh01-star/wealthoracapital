'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { ROUTES } from '@meridian/shared'
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  HeartPulse,
  TrendingUp,
  Users,
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
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  useAdminOpsDashboard,
  useAdminReferralSummary,
  useReviewDeposit,
  useReviewWithdrawal,
  adminQueryKeys,
} from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useQueryClient } from '@tanstack/react-query'
import { adminService, type AdminFinancialPeriod } from '@/services/admin.service'

/** Non-redundant shortcuts — KYC / Deposits / Withdrawals live in Action Center. */
const SECONDARY_ACTIONS = [
  { label: 'Publish Daily Return', href: ROUTES.admin.dailyReturn, icon: TrendingUp },
  { label: 'Manage Users', href: ROUTES.admin.users, icon: Users },
  { label: 'Notifications', href: ROUTES.admin.notifications, icon: Bell },
  { label: 'System Health', href: ROUTES.admin.systemHealth, icon: HeartPulse },
] as const

const PERIOD_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  month: 'This Month',
  all: 'Lifetime',
  custom: 'Custom',
}

function utcYmd(offsetDays = 0): string {
  const x = new Date()
  x.setUTCHours(0, 0, 0, 0)
  x.setUTCDate(x.getUTCDate() + offsetDays)
  return x.toISOString().slice(0, 10)
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
    <div className="rounded-xl border border-white/10 bg-[#0D1115]/95 px-3 py-2 text-caption shadow-e3 backdrop-blur-xl">
      <p className="text-fg-subtle">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 tabular-nums text-fg" style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString('en-US')}
        </p>
      ))}
    </div>
  )
}

function ActionCenterCard({
  title,
  href,
  attention,
  headline,
  cta,
  stats,
}: {
  title: string
  href: string
  attention: boolean
  headline: ReactNode
  cta: string
  stats: Array<{ label: string; value: ReactNode }>
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-2xl border px-4 py-4 transition-colors sm:px-5 sm:py-5',
        attention
          ? 'border-warning/35 bg-warning/[0.06] hover:border-warning/50 hover:bg-warning/[0.09]'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-overline text-fg-subtle">{title}</p>
        {attention ? (
          <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
            Needs review
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'mt-2 text-lg font-semibold tracking-tight sm:text-xl',
          attention ? 'text-warning' : 'text-fg',
        )}
      >
        {headline}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-fg-subtle">{s.label}</dt>
            <dd className="mt-0.5 truncate text-caption font-medium tabular-nums text-fg">{s.value}</dd>
          </div>
        ))}
      </dl>
      <span className="mt-4 inline-flex items-center gap-1 text-caption font-medium text-accent-200 group-hover:text-accent-100">
        {cta}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

function CompactMetric({
  label,
  kind,
  value,
  href,
}: {
  label: string
  kind: 'count' | 'money' | 'percent'
  value: string
  href?: string
}) {
  const body = (
    <>
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
        {kind === 'money' ? (
          <Money value={value} />
        ) : kind === 'percent' ? (
          `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
        ) : (
          Number(value).toLocaleString('en-US')
        )}
      </p>
    </>
  )
  const className =
    'rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors'
  if (href) {
    return (
      <Link href={href} className={cn(className, 'hover:border-white/[0.12] hover:bg-white/[0.04]')}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}

function findExecKpi(
  rows: Array<{ id: string; cards: Array<{ id: string; value: string }> }> | undefined,
  rowId: string,
  cardId: string,
): string | undefined {
  return rows?.find((r) => r.id === rowId)?.cards.find((c) => c.id === cardId)?.value
}

export function AdminOverviewWorkspace() {
  const queryClient = useQueryClient()
  const { data, isLoading, dataUpdatedAt, isFetching } = useAdminOpsDashboard()
  const { data: referralSummary } = useAdminReferralSummary()
  const reviewDeposit = useReviewDeposit()
  const reviewWithdrawal = useReviewWithdrawal()
  const [period, setPeriod] = useState('today')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [customFrom, setCustomFrom] = useState(() => utcYmd(-6))
  const [customTo, setCustomTo] = useState(() => utcYmd(0))
  const [customApplied, setCustomApplied] = useState<AdminFinancialPeriod | null>(null)
  const [customLoading, setCustomLoading] = useState(false)

  const periods = data?.periods ?? {}
  const selected =
    period === 'custom' ? customApplied : (periods[period] ?? periods.today)
  const charts = data?.charts
  const totals = data?.totals
  const pending = data?.pending
  const executiveKpis = data?.executiveKpis

  const todayPeriod = periods.today
  const monthPeriod = periods.month
  const kycPending = totals?.kyc.pending ?? 0
  const kycApprovedToday = charts?.kycApprovals?.at(-1)?.value ?? 0
  const depositsPending = totals?.deposits.pending ?? todayPeriod?.pendingDeposits ?? 0
  const withdrawalsPending =
    totals?.withdrawals.pending ?? todayPeriod?.pendingWithdrawals ?? 0
  const referralClaimable = referralSummary?.availableAmount ?? '0.00'
  const referralDistributedToday = todayPeriod?.referralDistributed ?? '0.00'
  const referralClaimedToday = todayPeriod?.referralClaimed ?? '0.00'

  const activeInvestors =
    findExecKpi(executiveKpis, 'users-aum', 'active-investors-balance') ?? '0'
  const aumValue = findExecKpi(executiveKpis, 'users-aum', 'total-aum') ?? '0.00'
  const currentMonthReturn =
    findExecKpi(executiveKpis, 'profit', 'current-month-return') ??
    findExecKpi(executiveKpis, 'profit', 'avg-monthly-return') ??
    '0'
  const openSupportTickets = findExecKpi(executiveKpis, 'ops', 'support-open')

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

  async function applyCustomRange() {
    if (!customFrom || !customTo) {
      toast.error('Select both From and To dates')
      return
    }
    if (customFrom > customTo) {
      toast.error('From date must be on or before To date')
      return
    }
    setCustomLoading(true)
    try {
      const row = await adminService.dashboardOpsPeriod(customFrom, customTo)
      setCustomApplied(row)
      setPeriod('custom')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Custom range failed')
    } finally {
      setCustomLoading(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Operations Dashboard"
        description="What needs your attention right now."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                isFetching
                  ? 'border-warning/30 text-warning'
                  : 'border-profit/30 text-profit',
              )}
            >
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              {isFetching ? 'Refreshing…' : 'Live · 30s'}
            </span>
            {dataUpdatedAt ? (
              <span className="hidden sm:inline">
                Updated {formatDateTime(new Date(dataUpdatedAt).toISOString())}
              </span>
            ) : null}
          </div>
        }
      />

      {/* Action Center — primary operational queues */}
      <section className="space-y-3">
        <h2 className="text-overline text-fg-subtle">Action Center</h2>
        {isLoading && !data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActionCenterCard
              title="KYC"
              href={ROUTES.admin.kyc}
              attention={kycPending > 0}
              headline={
                kycPending > 0 ? (
                  <>
                    <span className="tabular-nums">{kycPending}</span> Pending Review
                  </>
                ) : (
                  'No Pending KYC'
                )
              }
              cta={kycPending > 0 ? 'Review KYC' : 'View KYC'}
              stats={[
                { label: 'Approved today', value: kycApprovedToday },
                { label: 'Total pending', value: kycPending },
              ]}
            />
            <ActionCenterCard
              title="Deposits"
              href={
                depositsPending > 0
                  ? `${ROUTES.admin.deposits}?status=PENDING`
                  : ROUTES.admin.deposits
              }
              attention={depositsPending > 0}
              headline={
                depositsPending > 0 ? (
                  <>
                    <span className="tabular-nums">{depositsPending}</span> Pending Approval
                  </>
                ) : (
                  'No Pending Deposits'
                )
              }
              cta={depositsPending > 0 ? 'Review Pending Deposits' : 'View Deposits'}
              stats={[
                {
                  label: 'Today',
                  value: <Money value={todayPeriod?.deposits ?? '0.00'} />,
                },
                {
                  label: 'This Month',
                  value: <Money value={monthPeriod?.deposits ?? '0.00'} />,
                },
              ]}
            />
            <ActionCenterCard
              title="Withdrawals"
              href={ROUTES.admin.withdrawals}
              attention={withdrawalsPending > 0}
              headline={
                withdrawalsPending > 0 ? (
                  <>
                    <span className="tabular-nums">{withdrawalsPending}</span> Pending Approval
                  </>
                ) : (
                  'No Pending Withdrawals'
                )
              }
              cta={
                withdrawalsPending > 0 ? 'Review Pending Withdrawals' : 'View Withdrawals'
              }
              stats={[
                {
                  label: 'Today',
                  value: <Money value={todayPeriod?.withdrawals ?? '0.00'} />,
                },
                {
                  label: 'This Month',
                  value: <Money value={monthPeriod?.withdrawals ?? '0.00'} />,
                },
              ]}
            />
            <ActionCenterCard
              title="Referrals"
              href={ROUTES.admin.referrals}
              attention={false}
              headline={
                Number(referralClaimable) > 0 ? (
                  <>
                    Claimable <Money value={referralClaimable} />
                  </>
                ) : (
                  'No Claimable Rewards'
                )
              }
              cta="View Referrals"
              stats={[
                {
                  label: 'Distributed Today',
                  value: <Money value={referralDistributedToday} />,
                },
                {
                  label: 'Claimed Today',
                  value: <Money value={referralClaimedToday} />,
                },
              ]}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {SECONDARY_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Button key={action.href} asChild variant="ghost" size="sm" className="text-fg-muted">
                <Link href={action.href}>
                  <Icon className="size-3.5" aria-hidden />
                  {action.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </section>

      {/* Financial summary — preserved from prior work */}
      <section>
        <AdminPanel glow>
          <AdminPanelHeader title="Financial summary" description="Period totals from live ledger" />
          <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
            {Object.keys(PERIOD_LABELS).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === 'custom') {
                    setPeriod('custom')
                    return
                  }
                  setPeriod(key)
                }}
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
          {period === 'custom' ? (
            <div className="flex flex-wrap items-end gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
              <FormField label="From" className="min-w-[9rem] flex-1 sm:flex-none">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </FormField>
              <FormField label="To" className="min-w-[9rem] flex-1 sm:flex-none">
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </FormField>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={customLoading}
                onClick={() => void applyCustomRange()}
              >
                {customLoading ? 'Applying…' : 'Apply'}
              </Button>
            </div>
          ) : null}
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
                {
                  label: 'Referral Distributed',
                  value: selected.referralDistributed ?? '0.00',
                  hint:
                    typeof selected.referralDistributedCount === 'number'
                      ? `${selected.referralDistributedCount} reward${selected.referralDistributedCount === 1 ? '' : 's'}`
                      : undefined,
                },
                {
                  label: 'Referral Claimed',
                  value: selected.referralClaimed ?? '0.00',
                  hint:
                    typeof selected.referralClaimedCount === 'number'
                      ? `${selected.referralClaimedCount} claimed`
                      : undefined,
                },
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
          ) : period === 'custom' ? (
            <p className="px-4 py-6 text-caption text-fg-muted sm:px-5">
              Choose a date range and click Apply to load Financial summary.
            </p>
          ) : null}
        </AdminPanel>
      </section>

      {/* Platform Overview — users & assets */}
      <section className="space-y-3">
        <h2 className="text-overline text-fg-subtle">Investor Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CompactMetric
            label="Total Registered"
            kind="count"
            value={String(totals?.users.total ?? 0)}
            href={ROUTES.admin.users}
          />
          <CompactMetric
            label="Active Investors"
            kind="count"
            value={activeInvestors}
            href={ROUTES.admin.users}
          />
          <CompactMetric
            label="AUM"
            kind="money"
            value={aumValue}
            href={ROUTES.admin.wallets}
          />
          <CompactMetric
            label="Available Wallet Balance"
            kind="money"
            value={totals?.wallets.available ?? '0.00'}
            href={ROUTES.admin.wallets}
          />
        </div>
      </section>

      {/* Performance — compact profit snapshot */}
      <section className="space-y-3">
        <h2 className="text-overline text-fg-subtle">Performance</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <CompactMetric
            label="Today's Profit"
            kind="money"
            value={totals?.profit.daily ?? '0.00'}
            href={ROUTES.admin.dailyReturn}
          />
          <CompactMetric
            label="Monthly Profit"
            kind="money"
            value={totals?.profit.monthly ?? '0.00'}
            href={ROUTES.admin.dailyReturn}
          />
          <CompactMetric
            label="Current Month Return"
            kind="percent"
            value={currentMonthReturn}
            href={ROUTES.admin.performance}
          />
        </div>
      </section>

      {/* Analytics — non-duplicate charts */}
      <section className="space-y-3">
        <h2 className="text-overline text-fg-subtle">Analytics</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminPanel>
            <AdminPanelHeader title="Deposit vs Withdrawal" description="Last 30 days · approved / paid" />
            <div className="h-48 p-4 pt-0 sm:h-56 sm:p-5 sm:pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.depositVsWithdrawal ?? []}>
                  <defs>
                    <linearGradient id="execDepFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3CCB91" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3CCB91" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="execWdrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E05C67" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#E05C67" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} width={48} />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    name="Deposits"
                    stroke="#3CCB91"
                    fill="url(#execDepFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="withdrawals"
                    name="Withdrawals"
                    stroke="#E05C67"
                    fill="url(#execWdrFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Daily Profit Distribution" description="Last 30 days · non-reversed" />
            <div className="h-48 p-4 pt-0 sm:h-56 sm:p-5 sm:pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.profitDistributed ?? []}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} width={48} />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Profit"
                    stroke="#AAB3BD"
                    fill="rgba(167,139,250,0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="New User Registrations" description="Last 30 days" />
            <div className="h-48 p-4 pt-0 sm:h-56 sm:p-5 sm:pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.newUsers ?? []}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} width={32} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" name="Users" fill="#8FA8C0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader
              title="Active Investors Growth"
              description="Cumulative funded investors · last 30 days"
            />
            <div className="h-48 p-4 pt-0 sm:h-56 sm:p-5 sm:pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.activeInvestorsGrowth ?? []}>
                  <defs>
                    <linearGradient id="execInvFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4D9DF" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#D4D9DF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} width={40} />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Investors"
                    stroke="#D4D9DF"
                    fill="url(#execInvFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="KYC approvals" description="Last 30 days" />
            <div className="h-48 p-4 pt-0 sm:h-56 sm:p-5 sm:pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.kycApprovals ?? []}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} width={32} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" name="Approvals" fill="#D4D9DF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Wallet balances" description="Platform investment wallets" />
            <div className="h-48 p-4 pt-0 sm:h-56 sm:p-5 sm:pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={walletChart} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#89939E', fontSize: 11 }} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#89939E', fontSize: 11 }}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" name="Balance" fill="#C9A45C" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>
        </div>
      </section>

      {/* Quick review — actionable queues (not count duplicates) */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <h2 className="text-overline text-fg-subtle">Quick review</h2>
          <AdminPanel>
            <AdminPanelHeader
              title="Pending deposits"
              description="Approve or reject without leaving the dashboard"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${ROUTES.admin.deposits}?status=PENDING`}>View all</Link>
                </Button>
              }
            />
            <div className="divide-y divide-white/[0.05]">
              {(pending?.deposits ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-caption text-fg-muted sm:px-5">
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
                <p className="px-4 py-6 text-center text-caption text-fg-muted sm:px-5">
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
                <p className="px-4 py-6 text-center text-caption text-fg-muted sm:px-5">
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

        <section className="space-y-3">
          <h2 className="text-overline text-fg-subtle">Activity</h2>
          <AdminPanel className="h-full">
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
            <ul className="max-h-[28rem] space-y-0 overflow-y-auto px-4 py-2 sm:max-h-[36rem] sm:px-5">
              {(data?.activity ?? []).length === 0 ? (
                <li className="py-10 text-center text-caption text-fg-muted">No recent activity</li>
              ) : (
                (data?.activity ?? []).slice(0, 12).map((item) => (
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

      {/* Support ticket count — only non-duplicated Executive KPI signal */}
      {openSupportTickets !== undefined ? (
        <section className="space-y-3">
          <h2 className="text-overline text-fg-subtle">Support</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CompactMetric
              label="Open Support Tickets"
              kind="count"
              value={openSupportTickets}
              href={ROUTES.admin.support}
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}
