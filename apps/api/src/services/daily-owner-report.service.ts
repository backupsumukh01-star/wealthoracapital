import { prisma } from '../database/prisma.js'
import { logger } from '../utils/logger.js'
import { emailService } from '../emails/email.service.js'
import { opsAlertService } from './ops-alert.service.js'
import { realDepositWhere, realWithdrawalWhere } from './demo-investor.js'
import { env } from '../config/env.js'

function startOfUtcDay(d = new Date()) {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function moneySum(values: Array<{ amount: { toString(): string } | string | number }>) {
  return values
    .reduce((acc, row) => acc + Number(row.amount), 0)
    .toFixed(2)
}

/**
 * Daily owner summary emailed to ADMIN_ALERT_EMAILS.
 */
export const dailyOwnerReportService = {
  async buildSummary(day = new Date()) {
    const from = startOfUtcDay(day)
    const to = new Date(from)
    to.setUTCDate(to.getUTCDate() + 1)

    const [
      newUsers,
      kycSubmitted,
      kycApproved,
      kycRejected,
      pendingKyc,
      deposits,
      withdrawals,
      newTrades,
      supportTickets,
      errorLogs,
      roiRows,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: from, lt: to }, deletedAt: null } }),
      prisma.kycSubmission.count({
        where: { submittedAt: { gte: from, lt: to } },
      }),
      prisma.kycSubmission.count({
        where: { status: 'APPROVED', reviewedAt: { gte: from, lt: to } },
      }),
      prisma.kycSubmission.count({
        where: { status: 'REJECTED', reviewedAt: { gte: from, lt: to } },
      }),
      prisma.kycSubmission.count({
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] },
        },
      }),
      prisma.deposit.findMany({
        where: realDepositWhere({ createdAt: { gte: from, lt: to } }),
        select: { amount: true, status: true },
      }),
      prisma.withdrawal.findMany({
        where: realWithdrawalWhere({ createdAt: { gte: from, lt: to } }),
        select: { amount: true, status: true },
      }),
      prisma.trade.count({ where: { createdAt: { gte: from, lt: to } } }),
      prisma.supportTicket.count({ where: { createdAt: { gte: from, lt: to } } }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: from, lt: to },
          OR: [{ action: { contains: 'error' } }, { module: 'ops' }],
        },
      }),
      prisma.dailyReturnRun
        .findMany({
          where: {
            completedAt: { gte: from, lt: to },
            status: 'COMPLETED',
          },
          select: { totalDistributed: true },
        })
        .catch(() => [] as Array<{ totalDistributed: { toString(): string } }>),
    ])

    const depositAmount = moneySum(deposits)
    const approvedDepositAmount = moneySum(deposits.filter((d) => d.status === 'APPROVED'))
    const withdrawalAmount = moneySum(withdrawals)
    const paidWithdrawalAmount = moneySum(
      withdrawals.filter((w) => w.status === 'PAID' || w.status === 'COMPLETED'),
    )
    const roiDistributed = Array.isArray(roiRows)
      ? roiRows.reduce((acc, r) => acc + Number(r.totalDistributed), 0).toFixed(2)
      : '0'

    const topInvestors = await prisma.user.findMany({
      where: { deletedAt: null, role: 'USER' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        wallets: { where: { kind: 'INVESTMENT' }, select: { balance: true }, take: 1 },
      },
    })

    return {
      date: from.toISOString().slice(0, 10),
      newUsers,
      newKyc: kycSubmitted,
      approvedKyc: kycApproved,
      rejectedKyc: kycRejected,
      pendingKyc,
      deposits: deposits.length,
      depositAmount,
      approvedDepositAmount,
      withdrawals: withdrawals.length,
      withdrawalAmount,
      paidWithdrawalAmount,
      newInvestments: newTrades,
      supportTickets,
      errors: errorLogs,
      roiDistributed,
      topInvestors: topInvestors.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        balance: u.wallets[0]?.balance?.toString?.() ?? '0',
      })),
      pendingTasks: {
        pendingKyc,
        pendingDeposits: deposits.filter((d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW')
          .length,
        pendingWithdrawals: withdrawals.filter(
          (w) => w.status === 'PENDING' || w.status === 'UNDER_REVIEW' || w.status === 'APPROVED',
        ).length,
      },
      systemHealth: env.NODE_ENV,
    }
  },

  async sendDailyReport(day = new Date()) {
    const summary = await this.buildSummary(day)
    const recipients = opsAlertService.recipients()
    if (recipients.length === 0) {
      logger.info('Skipping daily owner report — ADMIN_ALERT_EMAILS empty')
      return summary
    }

    const lines = [
      `Wealthora Daily Report — ${summary.date}`,
      '',
      `New users: ${summary.newUsers}`,
      `New KYC: ${summary.newKyc}`,
      `Approved KYC: ${summary.approvedKyc}`,
      `Rejected KYC: ${summary.rejectedKyc}`,
      `Pending KYC: ${summary.pendingKyc}`,
      `Deposits: ${summary.deposits} (volume ${summary.depositAmount}, approved ${summary.approvedDepositAmount})`,
      `Withdrawals: ${summary.withdrawals} (volume ${summary.withdrawalAmount}, paid ${summary.paidWithdrawalAmount})`,
      `ROI distributed: ${summary.roiDistributed}`,
      `New trades/investments: ${summary.newInvestments}`,
      `Support tickets: ${summary.supportTickets}`,
      `Errors / ops alerts: ${summary.errors}`,
      `Pending deposits: ${summary.pendingTasks.pendingDeposits}`,
      `Pending withdrawals: ${summary.pendingTasks.pendingWithdrawals}`,
      `System: ${summary.systemHealth}`,
      '',
      'Top recent investors:',
      ...summary.topInvestors.map((u) => `· ${u.name} <${u.email}> balance=${u.balance}`),
    ]

    for (const to of recipients) {
      await emailService.sendAdminAlert({
        to,
        alertTitle: `Wealthora Daily Report — ${summary.date}`,
        alertBody: lines.join('\n'),
        reference: summary.date,
        adminLink: `${env.APP_URL.replace(/\/$/, '')}/admin`,
        fields: {
          Date: summary.date,
          'New users': String(summary.newUsers),
          'New KYC': String(summary.newKyc),
          'Approved KYC': String(summary.approvedKyc),
          'Rejected KYC': String(summary.rejectedKyc),
          'Pending KYC': String(summary.pendingKyc),
          Deposits: String(summary.deposits),
          'Deposit volume': summary.depositAmount,
          Withdrawals: String(summary.withdrawals),
          'Withdrawal volume': summary.withdrawalAmount,
          'ROI distributed': summary.roiDistributed,
          'Support tickets': String(summary.supportTickets),
          Errors: String(summary.errors),
        },
      })
    }

    logger.info({ date: summary.date, recipients: recipients.length }, 'Daily owner report sent')
    return summary
  },
}
