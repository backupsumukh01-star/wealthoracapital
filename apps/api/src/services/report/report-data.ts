import type { ReportType } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { moneyDisplay } from '../../utils/money.js'
import { realInvestorUser } from '../demo-investor.js'

export interface ReportDataResult {
  rows: Array<Record<string, unknown>>
  title: string
}

export type ReportFilters = {
  from?: string
  to?: string
  userId?: string
  status?: string
  user?: string
  email?: string
  phone?: string
  country?: string
  coin?: string
  network?: string
  amount?: string
  admin?: string
}

function dateRange(params: { from?: string; to?: string }) {
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = params.to ? new Date(params.to) : new Date()
  return { gte: from, lte: to }
}

async function resolveUserIds(params: ReportFilters): Promise<string[] | undefined> {
  if (params.userId) return [params.userId]

  const or: Array<Record<string, unknown>> = []

  if (params.email) {
    or.push({ email: { contains: params.email, mode: 'insensitive' } })
  }
  if (params.phone) {
    or.push({ phone: { contains: params.phone } })
  }
  if (params.user) {
    const q = params.user.trim()
    or.push(
      { id: q },
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    )
  }

  if (!or.length && !params.country) return undefined

  const users = await prisma.user.findMany({
    where: {
      ...realInvestorUser,
      AND: [
        ...(or.length ? [{ OR: or }] : []),
        ...(params.country
          ? [
              {
                OR: [
                  { country: { equals: params.country, mode: 'insensitive' as const } },
                  {
                    kycSubmissions: {
                      some: { country: { equals: params.country, mode: 'insensitive' as const } },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    select: { id: true },
    take: 500,
  })
  return users.map((u) => u.id)
}

function detailsMatch(
  details: unknown,
  coin?: string,
  network?: string,
): boolean {
  if (!coin && !network) return true
  if (!details || typeof details !== 'object') return false
  const d = details as Record<string, unknown>
  if (coin && String(d.coin ?? '').toUpperCase() !== coin.toUpperCase()) return false
  if (network && String(d.network ?? '').toUpperCase() !== network.toUpperCase()) return false
  return true
}

/** Fetches and flattens the rows for a report type — every field here is a JSON/CSV/PDF-safe primitive. */
export async function fetchReportRows(
  type: ReportType,
  params: ReportFilters,
): Promise<ReportDataResult> {
  const range = dateRange(params)
  const userIds = await resolveUserIds(params)
  const scopedUserId = params.userId
  const userFilter = scopedUserId
    ? { userId: scopedUserId }
    : userIds
      ? { userId: { in: userIds } }
      : {}

  switch (type) {
    case 'DAILY':
    case 'WEEKLY':
    case 'MONTHLY':
    case 'YEARLY': {
      if (scopedUserId || userIds?.length === 1) {
        const uid = scopedUserId ?? userIds![0]!
        const distributions = await prisma.profitDistribution.findMany({
          where: { userId: uid, date: range },
          orderBy: { date: 'asc' },
        })
        return {
          title: `${type} Return Report`,
          rows: distributions.map((r) => ({
            date: r.date.toISOString().slice(0, 10),
            returnPct: r.returnPct.toString(),
            amount: moneyDisplay(r.amount),
            eligibleBalance: moneyDisplay(r.eligibleBalance),
            balanceAfter: moneyDisplay(r.balanceAfter),
          })),
        }
      }
      const runs = await prisma.dailyReturnRun.findMany({
        where: { date: range },
        orderBy: { date: 'asc' },
      })
      return {
        title: `${type} Return Report`,
        rows: runs.map((r) => ({
          date: r.date.toISOString().slice(0, 10),
          returnPct: r.returnPct.toString(),
          status: r.status,
          eligibleWallets: r.eligibleWallets,
          processedWallets: r.processedWallets,
          totalBaseAmount: moneyDisplay(r.totalBaseAmount),
          totalDistributed: moneyDisplay(r.totalDistributed),
        })),
      }
    }
    case 'INVESTOR': {
      const users = await prisma.user.findMany({
        where: {
          ...realInvestorUser,
          createdAt: range,
          ...(userIds ? { id: { in: userIds } } : scopedUserId ? { id: scopedUserId } : {}),
          ...(params.status ? { status: params.status as never } : {}),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          status: true,
          kycStatus: true,
          country: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      return {
        title: 'Investor Report',
        rows: users.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.phone,
          country: u.country,
          status: u.status,
          kycStatus: u.kycStatus,
          joinedAt: u.createdAt.toISOString(),
        })),
      }
    }
    case 'PORTFOLIO':
    case 'PERFORMANCE': {
      if (scopedUserId || userIds) {
        const ids = scopedUserId ? [scopedUserId] : userIds!
        const allocations = await prisma.tradeAllocation.findMany({
          where: { userId: { in: ids }, trade: { tradeDate: range } },
          include: {
            trade: {
              select: {
                reference: true,
                pair: true,
                direction: true,
                status: true,
                outcome: true,
                tradeDate: true,
                returnPct: true,
                profitAmount: true,
                lossAmount: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 2000,
        })
        return {
          title: `${type === 'PORTFOLIO' ? 'Portfolio' : 'Performance'} Report`,
          rows: allocations.map((a) => ({
            reference: a.trade.reference,
            pair: a.trade.pair,
            direction: a.trade.direction,
            status: a.trade.status,
            outcome: a.trade.outcome,
            tradeDate: a.trade.tradeDate.toISOString().slice(0, 10),
            allocatedAmount: moneyDisplay(a.allocatedAmount),
            returnPct: a.trade.returnPct?.toString() ?? '',
            profit: a.trade.profitAmount ? moneyDisplay(a.trade.profitAmount) : '',
            loss: a.trade.lossAmount ? moneyDisplay(a.trade.lossAmount) : '',
          })),
        }
      }
      const trades = await prisma.trade.findMany({
        where: { tradeDate: range },
        orderBy: { tradeDate: 'desc' },
        take: 2000,
      })
      return {
        title: `${type === 'PORTFOLIO' ? 'Portfolio' : 'Performance'} Report`,
        rows: trades.map((t) => ({
          reference: t.reference,
          pair: t.pair,
          direction: t.direction,
          status: t.status,
          outcome: t.outcome,
          tradeDate: t.tradeDate.toISOString().slice(0, 10),
          returnPct: t.returnPct?.toString() ?? '',
          profit: t.profitAmount ? moneyDisplay(t.profitAmount) : '',
          loss: t.lossAmount ? moneyDisplay(t.lossAmount) : '',
        })),
      }
    }
    case 'FINANCE': {
      const [deposits, withdrawals] = await Promise.all([
        prisma.deposit.findMany({
          where: {
            createdAt: range,
            user: realInvestorUser,
            ...userFilter,
            ...(params.status ? { status: params.status as never } : {}),
            ...(params.amount ? { amount: params.amount } : {}),
            ...(params.admin ? { reviewedById: params.admin } : {}),
          },
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
            paymentMethod: { select: { name: true, type: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 2000,
        }),
        prisma.withdrawal.findMany({
          where: {
            createdAt: range,
            user: realInvestorUser,
            ...userFilter,
            ...(params.status ? { status: params.status as never } : {}),
            ...(params.amount ? { amount: params.amount } : {}),
            ...(params.admin ? { reviewedById: params.admin } : {}),
          },
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
            payoutMethod: { select: { label: true, type: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 2000,
        }),
      ])
      const depRows = deposits
        .filter((d) => detailsMatch(d.submissionDetails, params.coin, params.network))
        .map((d) => {
          const details =
            d.submissionDetails && typeof d.submissionDetails === 'object'
              ? (d.submissionDetails as Record<string, unknown>)
              : {}
          return {
            kind: 'DEPOSIT',
            reference: d.reference,
            user: `${d.user.firstName} ${d.user.lastName}`,
            email: d.user.email,
            amount: moneyDisplay(d.amount),
            fee: moneyDisplay(d.fee),
            currency: d.currency,
            coin: typeof details.coin === 'string' ? details.coin : '',
            network: typeof details.network === 'string' ? details.network : '',
            method: d.paymentMethod?.name ?? d.paymentMethod?.type ?? '',
            status: d.status,
            createdAt: d.createdAt.toISOString(),
          }
        })
      const wdrRows = withdrawals.map((w) => ({
        kind: 'WITHDRAWAL',
        reference: w.reference,
        user: `${w.user.firstName} ${w.user.lastName}`,
        email: w.user.email,
        amount: moneyDisplay(w.amount),
        fee: moneyDisplay(w.fee),
        currency: w.currency,
        coin: '',
        network: '',
        method: w.payoutMethod?.label ?? w.payoutMethod?.type ?? '',
        status: w.status,
        createdAt: w.createdAt.toISOString(),
      }))
      return {
        title: 'Finance Report',
        rows: [...depRows, ...wdrRows],
      }
    }
    case 'KYC': {
      const submissions = await prisma.kycSubmission.findMany({
        where: {
          createdAt: range,
          ...userFilter,
          ...(params.status ? { status: params.status as never } : {}),
          ...(params.country
            ? { country: { equals: params.country, mode: 'insensitive' } }
            : {}),
          ...(params.admin ? { assignedReviewerId: params.admin } : {}),
        },
        include: { user: { select: { email: true, firstName: true, lastName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      })
      return {
        title: 'KYC Report',
        rows: submissions.map((s) => ({
          reference: s.referenceId,
          user: `${s.user.firstName} ${s.user.lastName}`,
          email: s.user.email,
          phone: s.user.phone,
          status: s.status,
          riskLevel: s.riskLevel,
          country: s.country,
          createdAt: s.createdAt.toISOString(),
        })),
      }
    }
    case 'AUDIT': {
      const logs = await prisma.auditLog.findMany({
        where: {
          createdAt: range,
          ...(scopedUserId
            ? { OR: [{ actorId: scopedUserId }, { targetUserId: scopedUserId }] }
            : userIds
              ? { OR: [{ actorId: { in: userIds } }, { targetUserId: { in: userIds } }] }
              : {}),
          ...(params.admin
            ? {
                OR: [
                  { actorId: params.admin },
                  { actor: { email: { contains: params.admin, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      })
      return {
        title: 'Audit Report',
        rows: logs.map((l) => ({
          action: l.action,
          module: l.module,
          actorId: l.actorId,
          targetUserId: l.targetUserId,
          reason: l.reason,
          createdAt: l.createdAt.toISOString(),
        })),
      }
    }
    default:
      return { title: 'Custom Report', rows: [] }
  }
}
