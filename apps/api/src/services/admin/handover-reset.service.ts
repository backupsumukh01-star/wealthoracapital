import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Prisma, Role } from '@prisma/client'

import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { badRequest } from '../../utils/errors.js'
import { auditService } from '../audit.service.js'

export const HANDOVER_CONFIRM_PHRASE = 'RESET FOR CLIENT HANDOVER'

export type HandoverResetMode = 'TEST_DATA_RESET' | 'FULL_HANDOVER_RESET'

export type HandoverPreview = {
  mode: HandoverResetMode
  remove: {
    users: number
    wallets: number
    deposits: number
    withdrawals: number
    ledgerEntries: number
    transactions: number
    kycRecords: number
    notifications: number
    supportTickets: number
    otherUserGenerated: number
  }
  preserve: {
    staffUsers: number
    historicalTrades: number
    historicalDailyReturns: number
    historicalMonths: number
    yearsOfPerformance: number
    cmsDocuments: number
    platformSettings: number
    paymentMethods: number
  }
  actorPreserved: true
  warning: string
}

type RequestCtx = { ip?: string | null; userAgent?: string | null }

const STAFF_ROLES: Role[] = ['ADMIN', 'SUPER_ADMIN']

function staffWhere(): Prisma.UserWhereInput {
  return {
    OR: [{ role: { in: STAFF_ROLES } }, { staffRole: { not: null } }],
  }
}

function customerWhere(actorId: string): Prisma.UserWhereInput {
  return {
    AND: [
      { id: { not: actorId } },
      { role: 'USER' },
      { staffRole: null },
    ],
  }
}

async function listTargetUserIds(actorId: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: customerWhere(actorId),
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

async function countHistoricalMonths(): Promise<number> {
  const days = await prisma.dailyReturn.findMany({
    where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    select: { date: true },
  })
  const months = new Set(days.map((d) => d.date.toISOString().slice(0, 7)))
  return months.size
}

async function yearsFromDailyReturns(): Promise<number> {
  const first = await prisma.dailyReturn.findFirst({
    where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    orderBy: { date: 'asc' },
    select: { date: true },
  })
  const last = await prisma.dailyReturn.findFirst({
    where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    orderBy: { date: 'desc' },
    select: { date: true },
  })
  if (!first || !last) return 0
  const years =
    (last.date.getTime() - first.date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  if (years >= 2.5) return Math.round(years)
  if (years > 0) return Number(years.toFixed(2))
  const months = await countHistoricalMonths()
  return months >= 12 ? Math.max(1, Math.round(months / 12)) : 0
}

async function buildPreviewCounts(
  mode: HandoverResetMode,
  actorId: string,
): Promise<HandoverPreview> {
  const targetIds = await listTargetUserIds(actorId)
  const userFilter = { userId: { in: targetIds } }

  const [
    users,
    wallets,
    deposits,
    withdrawals,
    transactions,
    ledgerEntries,
    kycRecords,
    notifications,
    supportTickets,
    tradeAllocations,
    profitDistributions,
    portfolioSnapshots,
    investorPerformance,
    payoutMethods,
    sessions,
    activityLogs,
    staffUsers,
    historicalTrades,
    historicalDailyReturns,
    historicalMonths,
    yearsOfPerformance,
    cmsDocuments,
    platformSettings,
    paymentMethods,
  ] = await Promise.all([
    Promise.resolve(targetIds.length),
    targetIds.length ? prisma.wallet.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.deposit.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.withdrawal.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.transaction.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length
      ? prisma.ledgerEntry.count({
          where: { transaction: { userId: { in: targetIds } } },
        })
      : Promise.resolve(0),
    targetIds.length ? prisma.kycSubmission.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.notification.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.supportTicket.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.tradeAllocation.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.profitDistribution.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.portfolioSnapshot.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.investorPerformance.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.payoutMethod.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.session.count({ where: userFilter }) : Promise.resolve(0),
    targetIds.length ? prisma.activityLog.count({ where: userFilter }) : Promise.resolve(0),
    prisma.user.count({ where: staffWhere() }),
    prisma.trade.count({ where: { isPublic: true, status: 'CLOSED' } }),
    prisma.dailyReturn.count({ where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } } }),
    countHistoricalMonths(),
    yearsFromDailyReturns(),
    prisma.cmsDocument.count(),
    prisma.platformSetting.count(),
    prisma.paymentMethod.count(),
  ])

  const otherUserGenerated =
    tradeAllocations +
    profitDistributions +
    portfolioSnapshots +
    investorPerformance +
    payoutMethods +
    sessions +
    activityLogs

  return {
    mode,
    remove: {
      users,
      wallets,
      deposits,
      withdrawals,
      ledgerEntries,
      transactions,
      kycRecords,
      notifications,
      supportTickets,
      otherUserGenerated,
    },
    preserve: {
      staffUsers,
      historicalTrades,
      historicalDailyReturns,
      historicalMonths,
      yearsOfPerformance,
      cmsDocuments,
      platformSettings,
      paymentMethods,
    },
    actorPreserved: true,
    warning:
      'Destructive Operation — permanently removes test/customer operational records. Historical Performance / Backtest records will NOT be removed.',
  }
}

async function writeBackupSnapshot(input: {
  mode: HandoverResetMode
  actorId: string
  preview: HandoverPreview
  targetUserEmails: string[]
}): Promise<string> {
  const dir = path.resolve(env.UPLOAD_ROOT, 'handover-backups')
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(dir, `handover-${input.mode.toLowerCase()}-${stamp}.json`)
  const payload = {
    createdAt: new Date().toISOString(),
    mode: input.mode,
    actorId: input.actorId,
    note: 'Operational snapshot only — no passwords, KYC documents, or secrets.',
    counts: input.preview,
    targetUserEmails: input.targetUserEmails,
    preservedHint: {
      historicalDailyReturns: input.preview.preserve.historicalDailyReturns,
      historicalTrades: input.preview.preserve.historicalTrades,
      historicalMonths: input.preview.preserve.historicalMonths,
    },
  }
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
  return filePath
}

/**
 * Ordered deletion for customer/operational rows.
 * LedgerEntry Restrict → must delete entries before transactions/accounts.
 * Deposit/Withdrawal Restrict on Wallet → delete those before wallets.
 * NEVER touches DailyReturn, public Trade blotter, CMS, settings, payment methods, or staff users.
 */
async function deleteOperationalData(
  tx: Prisma.TransactionClient,
  targetIds: string[],
  mode: HandoverResetMode,
) {
  if (targetIds.length === 0 && mode === 'TEST_DATA_RESET') return

  const userIn = { in: targetIds }

  if (targetIds.length > 0) {
    const deposits = await tx.deposit.findMany({
      where: { userId: userIn },
      select: { id: true },
    })
    const withdrawals = await tx.withdrawal.findMany({
      where: { userId: userIn },
      select: { id: true },
    })
    const depositIds = deposits.map((d) => d.id)
    const withdrawalIds = withdrawals.map((w) => w.id)
    const txnIds = (
      await tx.transaction.findMany({
        where: { userId: userIn },
        select: { id: true },
      })
    ).map((t) => t.id)

    if (depositIds.length || withdrawalIds.length) {
      await tx.paymentWebhookEvent.deleteMany({
        where: {
          OR: [
            depositIds.length ? { depositId: { in: depositIds } } : undefined,
            withdrawalIds.length ? { withdrawalId: { in: withdrawalIds } } : undefined,
          ].filter(Boolean) as Prisma.PaymentWebhookEventWhereInput[],
        },
      })
      await tx.financeReview.deleteMany({
        where: {
          OR: [
            depositIds.length ? { depositId: { in: depositIds } } : undefined,
            withdrawalIds.length ? { withdrawalId: { in: withdrawalIds } } : undefined,
          ].filter(Boolean) as Prisma.FinanceReviewWhereInput[],
        },
      })
      await tx.approvalQueue.deleteMany({
        where: {
          OR: [
            depositIds.length ? { depositId: { in: depositIds } } : undefined,
            withdrawalIds.length ? { withdrawalId: { in: withdrawalIds } } : undefined,
          ].filter(Boolean) as Prisma.ApprovalQueueWhereInput[],
        },
      })
    }

    await tx.supportMessage.deleteMany({
      where: { ticket: { userId: userIn } },
    })
    await tx.supportTicket.deleteMany({ where: { userId: userIn } })
    await tx.notification.deleteMany({ where: { userId: userIn } })
    await tx.activityLog.deleteMany({ where: { userId: userIn } })

    await tx.kycHistory.deleteMany({ where: { submission: { userId: userIn } } })
    await tx.kycDocument.deleteMany({ where: { submission: { userId: userIn } } })
    await tx.kycReview.deleteMany({ where: { submission: { userId: userIn } } })
    await tx.kycSubmission.deleteMany({ where: { userId: userIn } })

    // User-specific performance — keep DailyReturn + DailyReturnRun + public trades.
    await tx.profitDistribution.deleteMany({ where: { userId: userIn } })
    await tx.tradeAllocation.deleteMany({ where: { userId: userIn } })
    await tx.portfolioSnapshot.deleteMany({ where: { userId: userIn } })
    await tx.investorPerformance.deleteMany({ where: { userId: userIn } })
    await tx.performanceMetric.deleteMany({ where: { userId: userIn } })

    await tx.emailOutbox.deleteMany({ where: { userId: userIn } })
    await tx.transactionHistory.deleteMany({ where: { userId: userIn } })

    if (txnIds.length) {
      // Temporary, transaction-scoped bypass of the immutability trigger for handover wipe only.
      await tx.$executeRawUnsafe(
        `ALTER TABLE "ledger_entries" DISABLE TRIGGER ledger_entries_no_update`,
      )
      try {
        await tx.ledgerEntry.deleteMany({ where: { transactionId: { in: txnIds } } })
      } finally {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "ledger_entries" ENABLE TRIGGER ledger_entries_no_update`,
        )
      }
    }

    // Clear deposit/withdrawal → transaction links, then delete finance rows before wallets.
    await tx.deposit.updateMany({
      where: { userId: userIn },
      data: { transactionId: null },
    })
    await tx.withdrawal.updateMany({
      where: { userId: userIn },
      data: { transactionId: null },
    })
    await tx.deposit.deleteMany({ where: { userId: userIn } })
    await tx.withdrawal.deleteMany({ where: { userId: userIn } })
    await tx.transaction.deleteMany({ where: { userId: userIn } })

    await tx.payoutMethod.deleteMany({ where: { userId: userIn } })
    await tx.ledgerAccount.deleteMany({
      where: { userId: userIn, isSystem: false },
    })
    await tx.wallet.deleteMany({ where: { userId: userIn } })

    await tx.session.deleteMany({ where: { userId: userIn } })
    await tx.verificationToken.deleteMany({ where: { userId: userIn } })
    await tx.userProfile.deleteMany({ where: { userId: userIn } })

    // Detach audit targets (keep audit history, no PII expansion).
    await tx.auditLog.updateMany({
      where: { targetUserId: userIn },
      data: { targetUserId: null },
    })
    await tx.activityLog.updateMany({
      where: { actorId: userIn },
      data: { actorId: null },
    })

    // Break referral edges among customers being removed.
    await tx.user.updateMany({
      where: { referredById: userIn },
      data: { referredById: null },
    })

    await tx.user.deleteMany({ where: { id: userIn } })
  }

  if (mode === 'FULL_HANDOVER_RESET') {
    // Orphaned operational artefacts not owned by remaining staff.
    await tx.reportJob.deleteMany({
      where: {
        OR: [{ requestedById: null }, { requestedById: { in: targetIds } }],
      },
    })
    await tx.reconciliationRun.deleteMany({})
    await tx.emailOutbox.deleteMany({ where: { userId: null } })
    await tx.paymentWebhookEvent.deleteMany({
      where: { depositId: null, withdrawalId: null },
    })
  }
}

export const handoverResetService = {
  async preview(mode: HandoverResetMode, actorId: string): Promise<HandoverPreview> {
    return buildPreviewCounts(mode, actorId)
  },

  async execute(input: {
    mode: HandoverResetMode
    actorId: string
    confirmationPhrase: string
    confirm: boolean
    ctx?: RequestCtx
  }) {
    if (!input.confirm) {
      throw badRequest('Second confirmation required. Set confirm=true to proceed.')
    }
    if (input.confirmationPhrase.trim() !== HANDOVER_CONFIRM_PHRASE) {
      throw badRequest(
        `Confirmation phrase mismatch. Type exactly: ${HANDOVER_CONFIRM_PHRASE}`,
      )
    }

    const actor = await prisma.user.findUnique({
      where: { id: input.actorId },
      select: { id: true, role: true, staffRole: true, email: true },
    })
    if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN')) {
      throw badRequest('Only an authenticated admin/staff operator can run handover reset.')
    }

    const previewBefore = await buildPreviewCounts(input.mode, input.actorId)
    const targets = await prisma.user.findMany({
      where: customerWhere(input.actorId),
      select: { id: true, email: true },
    })
    const targetIds = targets.map((t) => t.id)
    const targetEmails = targets.map((t) => t.email)

    const backupPath = await writeBackupSnapshot({
      mode: input.mode,
      actorId: input.actorId,
      preview: previewBefore,
      targetUserEmails: targetEmails,
    })

    await prisma.$transaction(
      async (tx) => {
        await deleteOperationalData(tx, targetIds, input.mode)
      },
      {
        maxWait: 30_000,
        timeout: 180_000,
      },
    )

    const previewAfter = await buildPreviewCounts(input.mode, input.actorId)

    // Verify historical dataset untouched.
    if (
      previewAfter.preserve.historicalDailyReturns !== previewBefore.preserve.historicalDailyReturns ||
      previewAfter.preserve.historicalTrades !== previewBefore.preserve.historicalTrades
    ) {
      throw badRequest(
        'Safety check failed: historical performance counts changed during reset. Manual review required.',
      )
    }

    await auditService.record({
      actorId: input.actorId,
      action: 'Client handover reset executed',
      module: 'handover',
      reason: `${input.mode} completed`,
      ip: input.ctx?.ip,
      userAgent: input.ctx?.userAgent,
      // Counts only — never passwords, KYC docs, or secrets.
      newValue: {
        mode: input.mode,
        removed: previewBefore.remove,
        preserved: previewBefore.preserve,
        backupPath: path.basename(backupPath),
        remainingCustomers: previewAfter.remove.users,
      },
    })

    return {
      mode: input.mode,
      message: 'Client handover reset completed.',
      backupPath: path.basename(backupPath),
      removed: previewBefore.remove,
      preserved: previewBefore.preserve,
      after: previewAfter.remove,
      historicalPerformance: {
        years: previewBefore.preserve.yearsOfPerformance,
        tradingDays: previewBefore.preserve.historicalDailyReturns,
        trades: previewBefore.preserve.historicalTrades,
        months: previewBefore.preserve.historicalMonths,
      },
    }
  },
}
