import { prisma } from '../database/prisma.js'
import { activityService } from './activity.service.js'
import { cache } from './cache/index.js'
import { moneyDisplay, d } from '../utils/money.js'

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
  const where = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  }
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
  const where = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  }
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
  const where = {
    isReversed: false,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  }
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
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    }),
    prisma.withdrawal.count({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] } },
    }),
    prisma.wallet.aggregate({
      where: { kind: 'INVESTMENT' },
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

export const dashboardService = {
  /**
   * Live operations snapshot for the Admin home dashboard.
   * Short TTL cache (10s) — UI polls every 15s.
   */
  async getOpsSnapshot() {
    const cacheKey = 'admin:dashboard:ops-v2'
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
    const weekAgo = utcDayStart(-6)

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
    ] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: today, lt: tomorrow }, deletedAt: null, role: 'USER' },
      }),
      prisma.user.count({
        where: { createdAt: { gte: yesterday, lt: today }, deletedAt: null, role: 'USER' },
      }),
      prisma.kycSubmission.count({
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] },
          submittedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.kycSubmission.count({
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] },
          submittedAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.deposit.count({
        where: {
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.deposit.count({
        where: {
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.withdrawal.count({
        where: {
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.withdrawal.count({
        where: {
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      depositStats(today, tomorrow),
      depositStats(yesterday, today),
      withdrawalStats(today, tomorrow),
      withdrawalStats(yesterday, today),
      profitDistributed(today, tomorrow),
      profitDistributed(yesterday, today),
      prisma.user.count({
        where: {
          role: 'USER',
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          deletedAt: null,
          updatedAt: { gte: today },
        },
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          deletedAt: null,
          updatedAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.deposit.count({
        where: { status: 'APPROVED', reviewedAt: { gte: today, lt: tomorrow } },
      }),
      prisma.deposit.count({
        where: { status: 'APPROVED', reviewedAt: { gte: yesterday, lt: today } },
      }),
      prisma.deposit.count({
        where: { status: 'REJECTED', reviewedAt: { gte: today, lt: tomorrow } },
      }),
      prisma.deposit.count({
        where: { status: 'REJECTED', reviewedAt: { gte: yesterday, lt: today } },
      }),
      prisma.withdrawal.count({
        where: {
          status: { in: ['APPROVED', 'PAID', 'COMPLETED'] },
          reviewedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.withdrawal.count({
        where: {
          status: { in: ['APPROVED', 'PAID', 'COMPLETED'] },
          reviewedAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.withdrawal.count({
        where: { status: 'REJECTED', reviewedAt: { gte: today, lt: tomorrow } },
      }),
      prisma.withdrawal.count({
        where: { status: 'REJECTED', reviewedAt: { gte: yesterday, lt: today } },
      }),
      prisma.deposit.findMany({
        where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          paymentMethod: { select: { name: true, type: true } },
        },
      }),
      prisma.withdrawal.findMany({
        where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          payoutMethod: { select: { label: true, type: true } },
        },
      }),
      prisma.kycSubmission.findMany({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] } },
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
      this.buildChartSeries(weekAgo, tomorrow),
      this.buildLifetimeTotals(),
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

    const activity = await activityService.list({
      page: 1,
      limit: 25,
      sortOrder: 'desc',
    })

    return {
      generatedAt: new Date().toISOString(),
      liveCards,
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

  async buildChartSeries(from: Date, to: Date) {
    const days: string[] = []
    for (let t = from.getTime(); t < to.getTime(); t += 86_400_000) {
      days.push(new Date(t).toISOString().slice(0, 10))
    }

    const [deposits, withdrawals, users, profits, kycApproved] = await Promise.all([
      prisma.deposit.findMany({
        where: { createdAt: { gte: from, lt: to }, status: 'APPROVED' },
        select: { createdAt: true, amount: true },
      }),
      prisma.withdrawal.findMany({
        where: {
          createdAt: { gte: from, lt: to },
          status: { in: ['PAID', 'COMPLETED'] },
        },
        select: { createdAt: true, amount: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: from, lt: to }, deletedAt: null, role: 'USER' },
        select: { createdAt: true },
      }),
      prisma.profitDistribution.findMany({
        where: { date: { gte: from, lt: to }, isReversed: false },
        select: { date: true, amount: true },
      }),
      prisma.kycSubmission.findMany({
        where: { status: 'APPROVED', reviewedAt: { gte: from, lt: to } },
        select: { reviewedAt: true },
      }),
    ])

    const bucket = (iso: string) => iso.slice(0, 10)
    const empty = () => Object.fromEntries(days.map((d) => [d, 0])) as Record<string, number>

    const dep = empty()
    const wdr = empty()
    const usr = empty()
    const prf = empty()
    const kyc = empty()

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

    return {
      depositsPerDay: days.map((day) => ({ day: day.slice(5), value: Number((dep[day] ?? 0).toFixed(2)) })),
      withdrawalsPerDay: days.map((day) => ({
        day: day.slice(5),
        value: Number((wdr[day] ?? 0).toFixed(2)),
      })),
      newUsers: days.map((day) => ({ day: day.slice(5), value: usr[day] ?? 0 })),
      profitDistributed: days.map((day) => ({
        day: day.slice(5),
        value: Number((prf[day] ?? 0).toFixed(2)),
      })),
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
      prisma.user.count({ where: { role: 'USER', deletedAt: null } }),
      prisma.user.count({ where: { role: 'USER', kycStatus: 'APPROVED', deletedAt: null } }),
      prisma.user.count({ where: { role: 'USER', status: 'ACTIVE', deletedAt: null } }),
      prisma.user.count({ where: { role: 'USER', status: 'SUSPENDED', deletedAt: null } }),
      prisma.user.count({ where: { role: 'USER', deletedAt: { not: null } } }),
      depositStats(null, null),
      withdrawalStats(null, null),
      prisma.kycSubmission.count(),
      prisma.kycSubmission.count({ where: { status: 'APPROVED' } }),
      prisma.kycSubmission.count({ where: { status: 'REJECTED' } }),
      prisma.kycSubmission.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] } },
      }),
      profitDistributed(null, null),
      profitDistributed(rangeFor('month').from, rangeFor('month').to),
      profitDistributed(rangeFor('today').from, rangeFor('today').to),
      prisma.wallet.aggregate({
        where: { kind: 'INVESTMENT' },
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
    return {
      totalUsers: ops.totals.users.total,
      todaysRegistrations: ops.liveCards.find((c) => c.id === 'new-users')?.count ?? 0,
      activeInvestors: ops.totals.users.active,
      pendingKyc: ops.totals.kyc.pending,
      pendingDeposits: ops.totals.deposits.pending,
      pendingWithdrawals: ops.totals.withdrawals.pending,
      suspendedUsers: ops.totals.users.suspended,
      blockedUsers: 0,
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
