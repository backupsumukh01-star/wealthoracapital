'use client'

import Link from 'next/link'
import { ROUTES, type MoneyString } from '@meridian/shared'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  FileCheck2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  type AdminDepositRow,
  type AdminWithdrawalRow,
  investorName,
  mapWithdrawalStatus,
  methodLabel,
} from '@/components/admin/admin-api-adapters'
import { AnimatedCounter } from '@/components/admin/animated-counter'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import {
  useAdminActivity,
  useAdminDeposits,
  useAdminHealth,
  useAdminReturns,
  useAdminUsers,
  useAdminWithdrawals,
} from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'
import { kycService } from '@/services/kyc.service'
import { useQuery } from '@tanstack/react-query'

function Kpi({
  label,
  icon: Icon,
  children,
  hint,
}: {
  label: string
  icon: typeof Users
  children: React.ReactNode
  hint?: string
}) {
  return (
    <AdminPanel className="p-4 sm:p-5" glow>
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption text-fg-muted">{label}</p>
        <span className="grid size-8 place-items-center rounded-xl bg-accent-500/15 text-accent-300">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-3 text-stat-md text-fg sm:text-stat-lg">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-fg-subtle">{hint}</p> : null}
    </AdminPanel>
  )
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
    <div className="glass-strong rounded-xl border border-glass-line px-3 py-2 text-caption shadow-e3">
      <p className="text-fg-subtle">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 tabular-nums text-fg" style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString('en-US')}
        </p>
      ))}
    </div>
  )
}

function metricNumber(health: ReturnType<typeof useAdminHealth>['data'], id: string) {
  const m = health?.metrics?.find((x) => x.id === id || x.label.toLowerCase().includes(id))
  if (!m) return 0
  const n = Number.parseFloat(String(m.value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function AdminOverviewWorkspace() {
  const { data: usersData } = useAdminUsers()
  const { data: depositsData } = useAdminDeposits()
  const { data: withdrawalsData } = useAdminWithdrawals()
  const { data: returnsData } = useAdminReturns()
  const { data: health } = useAdminHealth()
  const { data: activity } = useAdminActivity()
  const { data: kycQueue } = useQuery({
    queryKey: ['admin', 'kyc', 'queue', 'overview'],
    queryFn: () => kycService.adminList({ status: 'UNDER_REVIEW' }),
  })

  const accounts = usersData?.items ?? []
  const deposits = (depositsData?.items ?? []) as AdminDepositRow[]
  const withdrawals = (withdrawalsData?.items ?? []) as AdminWithdrawalRow[]
  const returns = returnsData?.items ?? []
  const pendingKycCount = kycQueue?.items?.length ?? 0
  const activityCount = activity?.items?.length ?? 0

  const pendingDeps = deposits.filter(
    (d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW',
  )
  const pendingWdr = withdrawals.filter((w) => {
    const s = mapWithdrawalStatus(w.status)
    return s === 'PENDING' || s === 'APPROVED'
  })
  const recent = [...accounts]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)

  const activeUsers = accounts.filter((u) => u.status === 'ACTIVE').length
  const aum = 0
  const latestReturn = [...returns].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  )[0]
  const monthAgo = Date.now() - 30 * 24 * 3600_000
  const monthlyGrowthPct = returns
    .filter((r) => +new Date(r.date) >= monthAgo)
    .reduce((sum, r) => sum + Number(r.returnPct), 0)
  const returnSeries = [...returns]
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(-7)
    .map((r) => ({ day: r.date.slice(5), pct: Number(r.returnPct) }))

  const today = new Date().toISOString().slice(0, 10)
  const dailyDeposits = deposits
    .filter((d) => d.createdAt?.startsWith(today) && d.status === 'APPROVED')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0)
  const dailyWithdrawals = withdrawals
    .filter((w) => w.createdAt?.startsWith(today) && (w.status === 'PAID' || w.status === 'COMPLETED'))
    .reduce((sum, w) => sum + Number(w.amount || 0), 0)

  const registrations = accounts.length
  const visitors = metricNumber(health, 'visitor') || activityCount
  const conversionRate =
    visitors > 0 ? Math.round((registrations / visitors) * 10000) / 100 : 0
  const countries = new Set(accounts.map((u) => u.country).filter(Boolean)).size

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Operations overview"
        description="Analytics, queues, and today’s settlement — the Growzy operating system home."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.admin.kyc}>KYC queue</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.admin.dailyReturn}>Publish return</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Activity events" icon={Users} hint="Recent platform activity">
          <AnimatedCounter value={activityCount} />
        </Kpi>
        <Kpi label="Registrations" icon={Users}>
          <AnimatedCounter value={registrations} />
        </Kpi>
        <Kpi label="Conversion rate" icon={TrendingUp}>
          <AnimatedCounter value={conversionRate} decimals={2} suffix="%" />
        </Kpi>
        <Kpi label="Countries" icon={BadgeCheck}>
          <AnimatedCounter value={countries} />
        </Kpi>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active users" icon={Users}>
          <AnimatedCounter value={activeUsers} />
        </Kpi>
        <Kpi label="Health signals" icon={Users} hint={health?.environment ?? '—'}>
          <AnimatedCounter value={health?.metrics?.length ?? 0} />
        </Kpi>
        <Kpi label="Pending KYC" icon={FileCheck2}>
          <AnimatedCounter value={pendingKycCount} />
        </Kpi>
        <Kpi label="Assets under management" icon={Wallet}>
          <Money value={aum.toFixed(2) as MoneyString} size="lg" />
        </Kpi>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Daily deposits" icon={ArrowDownToLine}>
          <Money value={dailyDeposits.toFixed(2) as MoneyString} size="md" />
        </Kpi>
        <Kpi label="Daily withdrawals" icon={ArrowUpFromLine}>
          <Money value={dailyWithdrawals.toFixed(2) as MoneyString} size="md" />
        </Kpi>
        <Kpi label="Pending deposits" icon={ArrowDownToLine}>
          <AnimatedCounter value={pendingDeps.length} />
        </Kpi>
        <Kpi label="Pending withdrawals" icon={ArrowUpFromLine}>
          <AnimatedCounter value={pendingWdr.length} />
        </Kpi>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi label="Latest published return" icon={TrendingUp} hint="Applied to eligible wallets">
          {latestReturn ? (
            <span className="text-profit">
              +<AnimatedCounter value={Number(latestReturn.returnPct)} decimals={2} suffix="%" />
            </span>
          ) : (
            <span className="text-fg-subtle">No returns yet</span>
          )}
        </Kpi>
        <Kpi label="Growth (30d)" icon={TrendingUp}>
          <span className={monthlyGrowthPct >= 0 ? 'text-profit' : 'text-loss'}>
            {monthlyGrowthPct >= 0 ? '+' : ''}
            <AnimatedCounter value={monthlyGrowthPct} decimals={2} suffix="%" />
          </span>
        </Kpi>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <AdminPanel className="xl:col-span-3" glow>
          <AdminPanelHeader title="Assets under management" description="Sum of investor wallet balances" />
          <div className="flex h-64 items-center justify-center px-2 pb-4 pt-2 sm:h-72">
            <PremiumEmptyState
              title="Historical AUM chart pending"
              description="A time-series AUM endpoint is not connected yet. Current AUM is shown above."
              variant="wallet"
            />
          </div>
        </AdminPanel>

        <AdminPanel className="xl:col-span-2" glow>
          <AdminPanelHeader title="Daily returns" description="Last sessions" />
          <div className="h-64 px-2 pb-4 pt-2 sm:h-72">
            {returnSeries.length === 0 ? (
              <PremiumEmptyState
                title="No published returns yet"
                description="Daily returns appear here once published."
                variant="activity"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'rgb(148 163 184)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={36}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="pct" name="Return %" fill="rgb(42 232 255)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel>
          <AdminPanelHeader
            title="Deposit queue"
            description={`${pendingDeps.length} awaiting action`}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.admin.deposits}>Open</Link>
              </Button>
            }
          />
          <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
            {pendingDeps.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-caption">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{investorName(d.user, d.id)}</p>
                  <p className="text-fg-subtle">
                    {methodLabel(d.method)} · {d.reference}
                  </p>
                </div>
                <Money value={d.amount} size="sm" />
              </li>
            ))}
          </ul>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader
            title="Withdrawal queue"
            description={`${pendingWdr.length} awaiting action`}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.admin.withdrawals}>Open</Link>
              </Button>
            }
          />
          <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
            {pendingWdr.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3 text-caption">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{investorName(w.user, w.id)}</p>
                  <p className="text-fg-subtle">{w.destinationLabel}</p>
                </div>
                <Money value={w.amount} size="sm" />
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      <AdminPanel>
        <AdminPanelHeader
          title="Recent registrations"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.admin.users}>All users</Link>
            </Button>
          }
        />
        {recent.length === 0 ? (
          <PremiumEmptyState
            title="No registrations yet"
            description="New investor sign-ups will show up here."
          />
        ) : (
          <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
            {recent.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-caption">
                <div>
                  <p className="font-medium text-fg">
                    {u.firstName} {u.lastName}{' '}
                    <span className="font-mono text-fg-subtle">@{u.email.split('@')[0]}</span>
                  </p>
                  <p className="text-fg-subtle">{u.id}</p>
                </div>
                <span className="text-fg-muted">{formatDateTime(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}
