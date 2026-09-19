import { prisma } from '../database/prisma.js'
import { activityService } from './activity.service.js'
import { cache } from './cache/index.js'
import { moneyDisplay, d } from '../utils/money.js'
import { realDepositWhere, realInvestorUser, realKycWhere, realProfitWhere, realWithdrawalWhere } from './demo-investor.js'

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'all'

function utcDayStart(offsetDays = 0): Date {
  const x = new Date()
  x.setUTCHours(0, 0, 0, 0)
  x.setUTCDate(x.getUTCDate() + offsetDays)
  return x
}

function rangeFor(period: PeriodKey): { from: Date | null; to: Date | null } {
  const today = utcDayStart(0)
  const tomorrow = utcDayStart(1)
  switch (period) {
    case 'today':
      return { from: today, to: tomorrow }
    case 'yesterday':
      return { from: utcDayStart(-1), to: today }
    case 'week':
      return { from: utcDayStart(-6), to: tomorrow }
    case 'month': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      return { from: start, to: tomorrow }
    }
    case 'all':
    default:
      return { from: null, to: null }
  }
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

async function depositStats(from: Date | null, to: Date | null) {
  const where = realDepositWhere({
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  })
  const [total, approved, rejected, pending, sumAll, sumApproved] = await Promise.all([
    prisma.deposit.count({ where }),
    prisma.deposit.count({ where: { ...where, status: 'APPROVED' } }),
    prisma.deposit.count({ where: { ...where, status: 'REJECTED' } }),
    prisma.deposit.count({
      where: { ...where, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    }),
    prisma.deposit.aggregate({ where, _sum: { amount: true } }),
    prisma.deposit.aggregate({
      where: { ...where, status: 'APPROVED' },
      _sum: { amount: true },
    }),
  ])
  return {
    total,
    approved,
    rejected,
    pending,
    amount: moneyDisplay(sumAll._sum.amount ?? 0),
    approvedAmount: moneyDisplay(sumApproved._sum.amount ?? 0),
  }
}

async function withdrawalStats(from: Date | null, to: Date | null) {
  const where = realWithdrawalWhere({
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  })
  const [total, approved, rejected, pending, paid, sumAll, sumPaid] = await Promise.all([
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.count({
      where: { ...where, status: { in: ['APPROVED', 'PROCESSING', 'PAID', 'COMPLETED'] } },
    }),
    prisma.withdrawal.count({ where: { ...where, status: 'REJECTED' } }),
    prisma.withdrawal.count({
      where: { ...where, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    }),
    prisma.withdrawal.count({
      where: { ...where, status: { in: ['PAID', 'COMPLETED'] } },
    }),
    prisma.withdrawal.aggregate({ where, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({
      where: { ...where, status: { in: ['PAID', 'COMPLETED'] } },
      _sum: { amount: true },
    }),
  ])
  return {
    total,
    approved,
    rejected,
    pending,
    paid,
    amount: moneyDisplay(sumAll._sum.amount ?? 0),
    paidAmount: moneyDisplay(sumPaid._sum.amount ?? 0),
  }
}

async function profitDistributed(from: Date | null, to: Date | null) {
  const where = realProfitWhere({
    isReversed: false,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  })
  const agg = await prisma.profitDistribution.aggregate({
    where,
    _sum: { amount: true },
    _count: true,
  })
  return {
    count: agg._count,
    amount: moneyDisplay(agg._sum.amount ?? 0),
  }
}

async function periodFinancials(period: PeriodKey) {
  const { from, to } = rangeFor(period)
  const [deposits, withdrawals, profit, pendingDeps, pendingWdr, aum] = await Promise.all([
    depositStats(from, to),
    withdrawalStats(from, to),
    profitDistributed(from, to),
    prisma.deposit.count({
      where: realDepositWhere({ status: { in: ['PENDING', 'UNDER_REVIEW'] } }),
    }),
    prisma.withdrawal.count({
      where: realWithdrawalWhere({
        status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] },
      }),
    }),
    prisma.wallet.aggregate({
      where: { kind: 'INVESTMENT', user: realInvestorUser },
      _sum: { availableBalance: true, lockedBalance: true, investedAmount: true },
    }),
  ])
  const platformBalance = d(aum._sum.availableBalance ?? 0)
    .plus(d(aum._sum.lockedBalance ?? 0))
  const activeInvestments = d(aum._sum.investedAmount ?? 0)
  return {
    period,
    deposits: deposits.approvedAmount,
    depositsCount: deposits.approved,
    withdrawals: withdrawals.paidAmount,
    withdrawalsCount: withdrawals.paid,
    profitDistributed: profit.amount,
    platformBalance: moneyDisplay(platformBalance),
    activeInvestments: moneyDisplay(activeInvestments),
    pendingDeposits: pendingDeps,
    pendingWithdrawals: pendingWdr,
  }
}

export type OpsLiveCard = {
  id: string
  label: string
  count: number
  amount: string | null
  changePct: number
  href: string
}

export type ExecutiveKpi = {
  id: string
  label: string
  kind: 'count' | 'money' | 'percent'
  /** Formatted display value (count as integer string, money as decimal string, percent as e.g. "2.45"). */
  value: string
  href: string
}

export type ExecutiveKpiRow = {
  id: string
  title: string
  cards: ExecutiveKpi[]
}

export const dashboardService = {
  /**
   * Live operations snapshot for the Admin home dashboard.
   * Short TTL cache (10s) — UI polls every 30s.
   */
  async getOpsSnapshot() {
    const cacheKey = 'admin:dashboard:ops-v5'
    const cached = await cache.get<Awaited<ReturnType<typeof this.buildOpsSnapshot>>>(cacheKey)
    if (cached) return cached
    const data = await this.buildOpsSnapshot()
    await cache.set(cacheKey, data, 10)
    return data
  },

  async buildOpsSnapshot() {
    const today = utcDayStart(0)
    const tomorrow = utcDayStart(1)
    const yesterday = utcDayStart(-1)
    const monthAgo = utcDayStart(-29)
    const monthRange = rangeFor('month')

    const [
      todayUsers,
      yesterdayUsers,
      todayPendingKyc,
      yesterdayPendingKyc,
      todayPendingDeps,
      yesterdayPendingDeps,
      todayPendingWdr,
      yesterdayPendingWdr,
      todayDepStats,
      yesterdayDepStats,
      todayWdrStats,
      yesterdayWdrStats,
      todayProfit,
      yesterdayProfit,
      todayActiveInvestors,
      yesterdayActiveInvestors,
      todayApprovedDeps,
      yesterdayApprovedDeps,
      todayRejectedDeps,
      yesterdayRejectedDeps,
      todayApprovedWdr,
      yesterdayApprovedWdr,
      todayRejectedWdr,
      yesterdayRejectedWdr,
      pendingDeposits,
      pendingWithdrawals,
      pendingKyc,
      periods,
      series,
      totals,
      monthDepStats,
      monthWdrStats,
      monthProfit,
      activeInvestorCount,
      openSupportTickets,
      avgMonthlyReturnPct,
    ] = await Promise.all([
      prisma.user.count({
        where: { ...realInvestorUser, createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.user.count({
        where: { ...realInvestorUser, createdAt: { gte: yesterday, lt: today } },
      }),
      prisma.kycSubmission.count({
        where: realKycWhere({
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] },
          submittedAt: { gte: today, lt: tomorrow },
        }),
      }),
      prisma.kycSubmission.count({
        where: realKycWhere({
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] },
          submittedAt: { gte: yesterday, lt: today },
        }),
      }),
      prisma.deposit.count({
        where: realDepositWhere({
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: today, lt: tomorrow },
        }),
      }),
      prisma.deposit.count({
        where: realDepositWhere({
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: yesterday, lt: today },
        }),
      }),
      prisma.withdrawal.count({
        where: realWithdrawalWhere({
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: today, lt: tomorrow },
        }),
      }),
      prisma.withdrawal.count({
        where: realWithdrawalWhere({
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: yesterday, lt: today },
        }),
      }),
      depositStats(today, tomorrow),
      depositStats(yesterday, today),
      withdrawalStats(today, tomorrow),
      withdrawalStats(yesterday, today),
      profitDistributed(today, tomorrow),
      profitDistributed(yesterday, today),
      prisma.user.count({
        where: {
          ...realInvestorUser,
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          updatedAt: { gte: today },
        },
      }),
      prisma.user.count({
        where: {
          ...realInvestorUser,
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          updatedAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.deposit.count({
        where: realDepositWhere({ status: 'APPROVED', reviewedAt: { gte: today, lt: tomorrow } }),
      }),
      prisma.deposit.count({
        where: realDepositWhere({ status: 'APPROVED', reviewedAt: { gte: yesterday, lt: today } }),
      }),
      prisma.deposit.count({
        where: realDepositWhere({ status: 'REJECTED', reviewedAt: { gte: today, lt: tomorrow } }),
      }),
      prisma.deposit.count({
        where: realDepositWhere({ status: 'REJECTED', reviewedAt: { gte: yesterday, lt: today } }),
      }),
      prisma.withdrawal.count({
        where: realWithdrawalWhere({
          status: { in: ['APPROVED', 'PAID', 'COMPLETED'] },
          reviewedAt: { gte: today, lt: tomorrow },
        }),
      }),
      prisma.withdrawal.count({
        where: realWithdrawalWhere({
          status: { in: ['APPROVED', 'PAID', 'COMPLETED'] },
          reviewedAt: { gte: yesterday, lt: today },
        }),
      }),
      prisma.withdrawal.count({
        where: realWithdrawalWhere({ status: 'REJECTED', reviewedAt: { gte: today, lt: tomorrow } }),
      }),
      prisma.withdrawal.count({
        where: realWithdrawalWhere({ status: 'REJECTED', reviewedAt: { gte: yesterday, lt: today } }),
      }),
      prisma.deposit.findMany({
        where: realDepositWhere({ status: { in: ['PENDING', 'UNDER_REVIEW'] } }),
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          paymentMethod: { select: { name: true, type: true } },
        },
      }),
      prisma.withdrawal.findMany({
        where: realWithdrawalWhere({ status: { in: ['PENDING', 'UNDER_REVIEW'] } }),
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          payoutMethod: { select: { label: true, type: true } },
        },
      }),
      prisma.kycSubmission.findMany({
        where: realKycWhere({ status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] } }),
        orderBy: { submittedAt: 'desc' },
        take: 8,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      Promise.all(
        (['today', 'yesterday', 'week', 'month', 'all'] as PeriodKey[]).map((p) =>
          periodFinancials(p),
        ),
      ),
      this.buildChartSeries(monthAgo, tomorrow),
      this.buildLifetimeTotals(),
      depositStats(monthRange.from, monthRange.to),
      withdrawalStats(monthRange.from, monthRange.to),
      profitDistributed(monthRange.from, monthRange.to),
      prisma.wallet.count({
        where: {
          kind: 'INVESTMENT',
          user: realInvestorUser,
          OR: [
            { availableBalance: { gt: 0 } },
            { investedAmount: { gt: 0 } },
            { balance: { gt: 0 } },
          ],
        },
      }),
      prisma.supportTicket.count({
        where: { status: { in: ['OPEN', 'PENDING'] } },
      }),
      this.averageMonthlyReturnPct(),
    ])

    const liveCards: OpsLiveCard[] = [
      {
        id: 'new-users',
        label: "Today's New Users",
        count: todayUsers,
        amount: null,
        changePct: pctChange(todayUsers, yesterdayUsers),
        href: '/admin/users',
      },
      {
        id: 'pending-kyc',
        label: "Today's Pending KYC",
        count: todayPendingKyc,
        amount: null,
        changePct: pctChange(todayPendingKyc, yesterdayPendingKyc),
        href: '/admin/kyc',
      },
      {
        id: 'pending-deposits',
        label: "Today's Pending Deposits",
        count: todayPendingDeps,
        amount: null,
        changePct: pctChange(todayPendingDeps, yesterdayPendingDeps),
        href: '/admin/deposits',
      },
      {
        id: 'pending-withdrawals',
        label: "Today's Pending Withdrawals",
        count: todayPendingWdr,
        amount: null,
        changePct: pctChange(todayPendingWdr, yesterdayPendingWdr),
        href: '/admin/withdrawals',
      },
      {
        id: 'total-deposits',
        label: "Today's Total Deposits",
        count: todayDepStats.total,
        amount: todayDepStats.amount,
        changePct: pctChange(
          Number(todayDepStats.amount),
          Number(yesterdayDepStats.amount),
        ),
        href: '/admin/deposits',
      },
      {
        id: 'total-withdrawals',
        label: "Today's Total Withdrawals",
        count: todayWdrStats.total,
        amount: todayWdrStats.amount,
        changePct: pctChange(
          Number(todayWdrStats.amount),
          Number(yesterdayWdrStats.amount),
        ),
        href: '/admin/withdrawals',
      },
      {
        id: 'profit-distribution',
        label: "Today's Profit Distribution",
        count: todayProfit.count,
        amount: todayProfit.amount,
        changePct: pctChange(Number(todayProfit.amount), Number(yesterdayProfit.amount)),
        href: '/admin/daily-return',
      },
      {
        id: 'active-investors',
        label: "Today's Active Investors",
        count: todayActiveInvestors,
        amount: null,
        changePct: pctChange(todayActiveInvestors, yesterdayActiveInvestors),
        href: '/admin/users',
      },
      {
        id: 'approved-deposits',
        label: "Today's Approved Deposits",
        count: todayApprovedDeps,
        amount: todayDepStats.approvedAmount,
        changePct: pctChange(todayApprovedDeps, yesterdayApprovedDeps),
        href: '/admin/deposits',
      },
      {
        id: 'rejected-deposits',
        label: "Today's Rejected Deposits",
        count: todayRejectedDeps,
        amount: null,
        changePct: pctChange(todayRejectedDeps, yesterdayRejectedDeps),
        href: '/admin/deposits',
      },
      {
        id: 'approved-withdrawals',
        label: "Today's Approved Withdrawals",
        count: todayApprovedWdr,
        amount: null,
        changePct: pctChange(todayApprovedWdr, yesterdayApprovedWdr),
        href: '/admin/withdrawals',
      },
      {
        id: 'rejected-withdrawals',
        label: "Today's Rejected Withdrawals",
        count: todayRejectedWdr,
        amount: null,
        changePct: pctChange(todayRejectedWdr, yesterdayRejectedWdr),
        href: '/admin/withdrawals',
      },
    ]

    const aum = moneyDisplay(
      d(totals.wallets.available)
        .plus(d(totals.wallets.locked))
        .plus(d(totals.wallets.invested)),
    )

    const executiveKpis: ExecutiveKpiRow[] = [
      {
        id: 'users-aum',
        title: 'Users & AUM',
        cards: [
          {
            id: 'total-registered-users',
            label: 'Total Registered Users',
            kind: 'count',
            value: String(totals.users.total),
            href: '/admin/users',
          },
          {
            id: 'active-investors-balance',
            label: 'Active Investors',
            kind: 'count',
            value: String(activeInvestorCount),
            href: '/admin/users',
          },
          {
            id: 'total-aum',
            label: 'Total Assets Under Management',
            kind: 'money',
            value: aum,
            href: '/admin/wallets',
          },
          {
            id: 'available-wallet-balance',
            label: 'Available Wallet Balance',
            kind: 'money',
            value: totals.wallets.available,
            href: '/admin/wallets',
          },
        ],
      },
      {
        id: 'deposits',
        title: 'Deposits',
        cards: [
          {
            id: 'deposits-today',
            label: "Today's Deposits",
            kind: 'money',
            value: todayDepStats.approvedAmount,
            href: '/admin/deposits',
          },
          {
            id: 'deposits-month',
            label: 'This Month Deposits',
            kind: 'money',
            value: monthDepStats.approvedAmount,
            href: '/admin/deposits',
          },
          {
            id: 'deposits-lifetime',
            label: 'Lifetime Deposits',
            kind: 'money',
            value: totals.deposits.approvedAmount,
            href: '/admin/deposits',
          },
          {
            id: 'deposits-pending',
            label: 'Pending Deposit Requests',
            kind: 'count',
            value: String(totals.deposits.pending),
            href: '/admin/deposits',
          },
        ],
      },
      {
        id: 'withdrawals',
        title: 'Withdrawals',
        cards: [
          {
            id: 'withdrawals-today',
            label: "Today's Withdrawals",
            kind: 'money',
            value: todayWdrStats.paidAmount,
            href: '/admin/withdrawals',
          },
          {
            id: 'withdrawals-month',
            label: 'This Month Withdrawals',
            kind: 'money',
            value: monthWdrStats.paidAmount,
            href: '/admin/withdrawals',
          },
          {
            id: 'withdrawals-lifetime',
            label: 'Lifetime Withdrawals',
            kind: 'money',
            value: totals.withdrawals.paidAmount,
            href: '/admin/withdrawals',
          },
          {
            id: 'withdrawals-pending',
            label: 'Pending Withdrawal Requests',
            kind: 'count',
            value: String(totals.withdrawals.pending),
            href: '/admin/withdrawals',
          },
        ],
      },
      {
        id: 'profit',
        title: 'Profit',
        cards: [
          {
            id: 'profit-lifetime',
            label: 'Total Profit Distributed',
            kind: 'money',
            value: totals.profit.lifetime,
            href: '/admin/daily-return',
          },
          {
            id: 'profit-today',
            label: 'Today Profit Distributed',
            kind: 'money',
            value: todayProfit.amount,
            href: '/admin/daily-return',
          },
          {
            id: 'profit-month',
            label: 'Monthly Profit Distributed',
            kind: 'money',
            value: monthProfit.amount,
            href: '/admin/daily-return',
          },
          {
            id: 'avg-monthly-return',
            label: 'Average Monthly Return',
            kind: 'percent',
            value: avgMonthlyReturnPct,
            href: '/admin/performance',
          },
        ],
      },
      {
        id: 'ops',
        title: 'KYC & Support',
        cards: [
          {
            id: 'kyc-pending',
            label: 'Pending KYC',
            kind: 'count',
            value: String(totals.kyc.pending),
            href: '/admin/kyc',
          },
          {
            id: 'kyc-approved',
            label: 'Approved KYC',
            kind: 'count',
            value: String(totals.kyc.approved),
            href: '/admin/kyc',
          },
          {
            id: 'kyc-rejected',
            label: 'Rejected KYC',
            kind: 'count',
            value: String(totals.kyc.rejected),
            href: '/admin/kyc',
          },
          {
            id: 'support-open',
            label: 'Open Support Tickets',
            kind: 'count',
            value: String(openSupportTickets),
            href: '/admin/support',
          },
        ],
      },
    ]

    const activity = await activityService.list({
      page: 1,
      limit: 25,
      sortOrder: 'desc',
    })

    return {
      generatedAt: new Date().toISOString(),
      liveCards,
      executiveKpis,
      periods: Object.fromEntries(periods.map((p) => [p.period, p])),
      charts: series,
      totals,
      pending: {
        deposits: pendingDeposits.map((row) => {
          const details =
            row.submissionDetails && typeof row.submissionDetails === 'object'
              ? (row.submissionDetails as Record<string, unknown>)
              : {}
          return {
            id: row.id,
            reference: row.reference,
            amount: moneyDisplay(row.amount),
            coin: typeof details.coin === 'string' ? details.coin : null,
            network: typeof details.network === 'string' ? details.network : null,
            method: row.paymentMethod?.name ?? row.paymentMethod?.type ?? '—',
            createdAt: row.createdAt.toISOString(),
            user: {
              id: row.user.id,
              name: `${row.user.firstName} ${row.user.lastName}`.trim(),
              email: row.user.email,
            },
          }
        }),
        withdrawals: pendingWithdrawals.map((row) => ({
          id: row.id,
          reference: row.reference,
          amount: moneyDisplay(row.amount),
          method: row.payoutMethod?.label ?? row.payoutMethod?.type ?? '—',
          createdAt: row.createdAt.toISOString(),
          user: {
            id: row.user.id,
            name: `${row.user.firstName} ${row.user.lastName}`.trim(),
            email: row.user.email,
          },
        })),
        kyc: pendingKyc.map((row) => ({
          id: row.id,
          userId: row.userId,
          country: row.country,
          submittedAt: row.submittedAt?.toISOString() ?? row.createdAt.toISOString(),
          status: row.status,
          user: {
            id: row.user.id,
            name: `${row.user.firstName} ${row.user.lastName}`.trim(),
            email: row.user.email,
          },
        })),
      },
      activity: activity.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: item.description ?? null,
        at: item.at,
      })),
    }
  },

  async averageMonthlyReturnPct() {
    const from = new Date()
    from.setUTCMonth(from.getUTCMonth() - 12)
    from.setUTCHours(0, 0, 0, 0)

    const runs = await prisma.dailyReturnRun.findMany({
      where: { status: 'COMPLETED', date: { gte: from } },
      select: { date: true, returnPct: true },
      orderBy: { date: 'asc' },
    })

    if (runs.length === 0) return '0.00'

    const byMonth = new Map<string, Array<ReturnType<typeof d>>>()
    for (const run of runs) {
      const key = run.date.toISOString().slice(0, 7)
      const bucket = byMonth.get(key) ?? []
      bucket.push(d(run.returnPct))
      byMonth.set(key, bucket)
    }

    const monthly: ReturnType<typeof d>[] = []
    for (const pcts of byMonth.values()) {
      let factor = d(1)
      for (const pct of pcts) {
        factor = factor.mul(d(1).plus(pct.div(100)))
      }
      monthly.push(factor.minus(1).mul(100))
    }

    if (monthly.length === 0) return '0.00'
    const sum = monthly.reduce((acc, n) => acc.plus(n), d(0))
    return sum.div(monthly.length).toFixed(2)
  },

  async buildChartSeries(from: Date, to: Date) {
    const days: string[] = []
    for (let t = from.getTime(); t < to.getTime(); t += 86_400_000) {
      days.push(new Date(t).toISOString().slice(0, 10))
    }

    const [deposits, withdrawals, users, profits, kycApproved, firstFunded] = await Promise.all([
      prisma.deposit.findMany({
        where: realDepositWhere({ createdAt: { gte: from, lt: to }, status: 'APPROVED' }),
        select: { createdAt: true, amount: true },
      }),
      prisma.withdrawal.findMany({
        where: realWithdrawalWhere({
          createdAt: { gte: from, lt: to },
          status: { in: ['PAID', 'COMPLETED'] },
        }),
        select: { createdAt: true, amount: true },
      }),
      prisma.user.findMany({
        where: { ...realInvestorUser, createdAt: { gte: from, lt: to } },
        select: { createdAt: true },
      }),
      prisma.profitDistribution.findMany({
        where: realProfitWhere({ date: { gte: from, lt: to }, isReversed: false }),
        select: { date: true, amount: true },
      }),
      prisma.kycSubmission.findMany({
        where: realKycWhere({ status: 'APPROVED', reviewedAt: { gte: from, lt: to } }),
        select: { reviewedAt: true },
      }),
      prisma.deposit.groupBy({
        by: ['userId'],
        where: realDepositWhere({ status: 'APPROVED' }),
        _min: { createdAt: true },
      }),
    ])

    const bucket = (iso: string) => iso.slice(0, 10)
    const empty = () => Object.fromEntries(days.map((d) => [d, 0])) as Record<string, number>

    const dep = empty()
    const wdr = empty()
    const usr = empty()
    const prf = empty()
    const kyc = empty()
    const fundedPerDay = empty()

    for (const row of deposits) {
      const k = bucket(row.createdAt.toISOString())
      if (k in dep) dep[k] = (dep[k] ?? 0) + Number(row.amount)
    }
    for (const row of withdrawals) {
      const k = bucket(row.createdAt.toISOString())
      if (k in wdr) wdr[k] = (wdr[k] ?? 0) + Number(row.amount)
    }
    for (const row of users) {
      const k = bucket(row.createdAt.toISOString())
      if (k in usr) usr[k] = (usr[k] ?? 0) + 1
    }
    for (const row of profits) {
      const k = bucket(row.date.toISOString())
      if (k in prf) prf[k] = (prf[k] ?? 0) + Number(row.amount)
    }
    for (const row of kycApproved) {
      if (!row.reviewedAt) continue
      const k = bucket(row.reviewedAt.toISOString())
      if (k in kyc) kyc[k] = (kyc[k] ?? 0) + 1
    }

    let fundedBeforeWindow = 0
    for (const row of firstFunded) {
      const firstAt = row._min.createdAt
      if (!firstAt) continue
      const k = bucket(firstAt.toISOString())
      if (firstAt < from) {
        fundedBeforeWindow += 1
        continue
      }
      if (k in fundedPerDay) fundedPerDay[k] = (fundedPerDay[k] ?? 0) + 1
    }

    let cumulativeInvestors = fundedBeforeWindow
    const activeInvestorsGrowth = days.map((day) => {
      cumulativeInvestors += fundedPerDay[day] ?? 0
      return { day: day.slice(5), value: cumulativeInvestors }
    })

    return {
      depositsPerDay: days.map((day) => ({ day: day.slice(5), value: Number((dep[day] ?? 0).toFixed(2)) })),
      withdrawalsPerDay: days.map((day) => ({
        day: day.slice(5),
        value: Number((wdr[day] ?? 0).toFixed(2)),
      })),
      depositVsWithdrawal: days.map((day) => ({
        day: day.slice(5),
        deposits: Number((dep[day] ?? 0).toFixed(2)),
        withdrawals: Number((wdr[day] ?? 0).toFixed(2)),
      })),
      newUsers: days.map((day) => ({ day: day.slice(5), value: usr[day] ?? 0 })),
      profitDistributed: days.map((day) => ({
        day: day.slice(5),
        value: Number((prf[day] ?? 0).toFixed(2)),
      })),
      activeInvestorsGrowth,
      kycApprovals: days.map((day) => ({ day: day.slice(5), value: kyc[day] ?? 0 })),
    }
  },

  async buildLifetimeTotals() {
    const [
      users,
      verified,
      active,
      suspended,
      deleted,
      dep,
      wdr,
      kycTotal,
      kycApproved,
      kycRejected,
      kycPending,
      profitAll,
      profitMonth,
      profitToday,
      aum,
    ] = await Promise.all([
      prisma.user.count({ where: realInvestorUser }),
      prisma.user.count({ where: { ...realInvestorUser, kycStatus: 'APPROVED' } }),
      prisma.user.count({ where: { ...realInvestorUser, status: 'ACTIVE' } }),
      prisma.user.count({ where: { ...realInvestorUser, status: 'SUSPENDED' } }),
      prisma.user.count({ where: { role: 'USER', deletedAt: { not: null }, createdByAdminId: null } }),
      depositStats(null, null),
      withdrawalStats(null, null),
      prisma.kycSubmission.count({ where: realKycWhere() }),
      prisma.kycSubmission.count({ where: realKycWhere({ status: 'APPROVED' }) }),
      prisma.kycSubmission.count({ where: realKycWhere({ status: 'REJECTED' }) }),
      prisma.kycSubmission.count({
        where: realKycWhere({ status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] } }),
      }),
      profitDistributed(null, null),
      profitDistributed(rangeFor('month').from, rangeFor('month').to),
      profitDistributed(rangeFor('today').from, rangeFor('today').to),
      prisma.wallet.aggregate({
        where: { kind: 'INVESTMENT', user: realInvestorUser },
        _sum: { availableBalance: true, lockedBalance: true, investedAmount: true },
      }),
    ])

    return {
      users: { total: users, verified, active, suspended, deleted },
      deposits: dep,
      withdrawals: wdr,
      kyc: { total: kycTotal, approved: kycApproved, rejected: kycRejected, pending: kycPending },
      profit: {
        daily: profitToday.amount,
        monthly: profitMonth.amount,
        lifetime: profitAll.amount,
        lifetimeCount: profitAll.count,
      },
      wallets: {
        available: moneyDisplay(aum._sum.availableBalance ?? 0),
        locked: moneyDisplay(aum._sum.lockedBalance ?? 0),
        invested: moneyDisplay(aum._sum.investedAmount ?? 0),
        platformBalance: moneyDisplay(
          d(aum._sum.availableBalance ?? 0).plus(d(aum._sum.lockedBalance ?? 0)),
        ),
      },
    }
  },

  /** Legacy summary kept for older clients. */
  async getSummary() {
    const ops = await this.getOpsSnapshot()
    const blockedUsers = await prisma.user.count({
      where: { ...realInvestorUser, status: 'BLOCKED' },
    })
    return {
      totalUsers: ops.totals.users.total,
      todaysRegistrations: ops.liveCards.find((c) => c.id === 'new-users')?.count ?? 0,
      activeInvestors: ops.totals.users.active,
      pendingKyc: ops.totals.kyc.pending,
      pendingDeposits: ops.totals.deposits.pending,
      pendingWithdrawals: ops.totals.withdrawals.pending,
      suspendedUsers: ops.totals.users.suspended,
      blockedUsers,
      revenueSummary: { totalRevenue: ops.totals.profit.lifetime, currency: 'USD' },
      investmentSummary: {
        totalAum: ops.totals.wallets.invested,
        currency: 'USD',
      },
      recentActivities: ops.activity.slice(0, 10),
      ops,
    }
  },
}
