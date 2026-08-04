import type { ReportType } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { moneyDisplay } from '../../utils/money.js'

export interface ReportDataResult {
  rows: Array<Record<string, unknown>>
  title: string
}

function dateRange(params: { from?: string; to?: string }) {
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = params.to ? new Date(params.to) : new Date()
  return { gte: from, lte: to }
}

/** Fetches and flattens the rows for a report type — every field here is a JSON/CSV/PDF-safe primitive. */
export async function fetchReportRows(
  type: ReportType,
  params: { from?: string; to?: string; userId?: string; status?: string },
): Promise<ReportDataResult> {
  const range = dateRange(params)

  switch (type) {
    case 'DAILY':
    case 'WEEKLY':
    case 'MONTHLY':
    case 'YEARLY': {
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
        where: { role: 'USER', createdAt: range },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          kycStatus: true,
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
          status: u.status,
          kycStatus: u.kycStatus,
          joinedAt: u.createdAt.toISOString(),
        })),
      }
    }
    case 'PORTFOLIO':
    case 'PERFORMANCE': {
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
        prisma.deposit.findMany({ where: { createdAt: range }, orderBy: { createdAt: 'desc' }, take: 2000 }),
        prisma.withdrawal.findMany({ where: { createdAt: range }, orderBy: { createdAt: 'desc' }, take: 2000 }),
      ])
      return {
        title: 'Finance Report',
        rows: [
          ...deposits.map((d) => ({
            kind: 'DEPOSIT',
            reference: d.reference,
            amount: moneyDisplay(d.amount),
            fee: moneyDisplay(d.fee),
            currency: d.currency,
            status: d.status,
            createdAt: d.createdAt.toISOString(),
          })),
          ...withdrawals.map((w) => ({
            kind: 'WITHDRAWAL',
            reference: w.reference,
            amount: moneyDisplay(w.amount),
            fee: moneyDisplay(w.fee),
            currency: w.currency,
            status: w.status,
            createdAt: w.createdAt.toISOString(),
          })),
        ],
      }
    }
    case 'KYC': {
      const submissions = await prisma.kycSubmission.findMany({
        where: { createdAt: range },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      })
      return {
        title: 'KYC Report',
        rows: submissions.map((s) => ({
          reference: s.referenceId,
          user: `${s.user.firstName} ${s.user.lastName}`,
          email: s.user.email,
          status: s.status,
          riskLevel: s.riskLevel,
          country: s.country,
          createdAt: s.createdAt.toISOString(),
        })),
      }
    }
    case 'AUDIT': {
      const logs = await prisma.auditLog.findMany({
        where: { createdAt: range },
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
