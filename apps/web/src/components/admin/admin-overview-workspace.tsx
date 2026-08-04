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

import { AnimatedCounter } from '@/components/admin/animated-counter'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import {
  ADMIN_AUM_SERIES,
  ADMIN_INVESTORS,
  ADMIN_RETURN_SERIES,
  ADMIN_STATS,
  investorName,
} from '@/lib/admin-demo-data'
import { formatDateTime } from '@/lib/format'
import { useAdminOs } from '@/providers/admin-os-provider'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

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

export function AdminOverviewWorkspace() {
  const { state: os } = useAdminOs()
  const { pendingKycAccounts, deposits, withdrawals } = useInvestorLifecycle()
  const analytics = os.analytics
  const pendingDeps = deposits.filter(
    (d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW' || d.status === 'NEED_INFO',
  )
  const pendingWdr = withdrawals.filter((w) => w.status === 'PENDING' || w.status === 'APPROVED')
  const recent = [...ADMIN_INVESTORS]
    .sort((a, b) => +new Date(b.registeredAt) - +new Date(a.registeredAt))
    .slice(0, 5)

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
        <Kpi label="Visitors (7d)" icon={Users} hint="Marketing traffic">
          <AnimatedCounter value={analytics.visitors} />
        </Kpi>
        <Kpi label="Registrations" icon={Users}>
          <AnimatedCounter value={analytics.registrations} />
        </Kpi>
        <Kpi label="Conversion rate" icon={TrendingUp}>
          <AnimatedCounter value={analytics.conversionRate} decimals={2} suffix="%" />
        </Kpi>
        <Kpi label="Countries" icon={BadgeCheck}>
          <AnimatedCounter value={analytics.countries} />
        </Kpi>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active users" icon={Users}>
          <AnimatedCounter value={analytics.activeUsers} />
        </Kpi>
        <Kpi label="Online now" icon={Users} hint="Demo presence">
          <AnimatedCounter value={analytics.onlineUsers} />
        </Kpi>
        <Kpi label="Pending KYC" icon={FileCheck2}>
          <AnimatedCounter value={pendingKycAccounts.length || analytics.pendingKyc} />
        </Kpi>
        <Kpi label="Assets under management" icon={Wallet}>
          <Money value={ADMIN_STATS.aum} size="lg" />
        </Kpi>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Daily deposits" icon={ArrowDownToLine}>
          <Money value={analytics.dailyDeposits as MoneyString} size="md" />
        </Kpi>
        <Kpi label="Daily withdrawals" icon={ArrowUpFromLine}>
          <Money value={analytics.dailyWithdrawals as MoneyString} size="md" />
        </Kpi>
        <Kpi label="Pending deposits" icon={ArrowDownToLine}>
          <AnimatedCounter value={pendingDeps.length || analytics.pendingDeposits} />
        </Kpi>
        <Kpi label="Pending withdrawals" icon={ArrowUpFromLine}>
          <AnimatedCounter value={pendingWdr.length || analytics.pendingWithdrawals} />
        </Kpi>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi label="Today’s published return" icon={TrendingUp} hint="Applied to eligible wallets">
          <span className="text-profit">
            +<AnimatedCounter value={Number(ADMIN_STATS.todayReturnPct)} decimals={2} suffix="%" />
          </span>
        </Kpi>
        <Kpi label="Monthly growth" icon={TrendingUp}>
          <span className="text-profit">
            +<AnimatedCounter value={Number(ADMIN_STATS.monthlyGrowthPct)} decimals={2} suffix="%" />
          </span>
        </Kpi>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <AdminPanel className="xl:col-span-3" glow>
          <AdminPanelHeader title="AUM · 7 days" description="Deposits vs withdrawals overlay" />
          <div className="h-64 px-2 pb-4 pt-2 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ADMIN_AUM_SERIES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="aumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(18 214 160)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(18 214 160)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(2)}M`}
                  width={42}
                />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="aum"
                  name="AUM"
                  stroke="rgb(18 214 160)"
                  fill="url(#aumFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel className="xl:col-span-2" glow>
          <AdminPanelHeader title="Daily returns" description="Last sessions" />
          <div className="h-64 px-2 pb-4 pt-2 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ADMIN_RETURN_SERIES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  <p className="truncate font-medium text-fg">{investorName(d.userId)}</p>
                  <p className="text-fg-subtle">
                    {d.method} · {d.reference}
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
                  <p className="truncate font-medium text-fg">{investorName(w.userId)}</p>
                  <p className="text-fg-subtle">{w.destinationDetail}</p>
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
        <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
          {recent.map((u) => (
            <li key={u.userId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-caption">
              <div>
                <p className="font-medium text-fg">
                  {u.firstName} {u.lastName}{' '}
                  <span className="font-mono text-fg-subtle">@{u.username}</span>
                </p>
                <p className="text-fg-subtle">{u.userId}</p>
              </div>
              <span className="text-fg-muted">{formatDateTime(u.registeredAt)}</span>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  )
}
