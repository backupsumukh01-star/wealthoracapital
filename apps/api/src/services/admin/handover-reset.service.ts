import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, type Role, type StaffRole } from '@prisma/client'

import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { AppError, badRequest, internalError } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { auditService } from '../audit.service.js'

export const HANDOVER_CONFIRM_PHRASE = 'RESET'

export type HandoverResetMode = 'TEST_DATA_RESET' | 'FULL_HANDOVER_RESET'

type QueryClient = Prisma.TransactionClient | typeof prisma
type RequestCtx = { ip?: string | null; userAgent?: string | null }
type HistoricalStatus = 'PUBLISHED' | 'DISTRIBUTED'
type PrivilegedActor = {
  id: string
  role: Role
  staffRole: StaffRole | null
  email?: string
}

type HandoverRemoveCounts = {
  users: number
  wallets: number
  deposits: number
  withdrawals: number
  ledgerEntries: number
  transactions: number
  balances: number
  kycRecords: number
  notifications: number
  supportTickets: number
  sessions: number
  otherUserGenerated: number
}

type HandoverPreserveCounts = {
  staffUsers: number
  historicalTrades: number
  historicalDailyReturns: number
  historicalMonths: number
  yearsOfPerformance: number
  historicalPeriodLabel: string
  cmsDocuments: number
  platformSettings: number
  paymentMethods: number
}

type FullResetCleanupCounts = {
  reportJobs: number
  reconciliationRuns: number
  orphanEmailOutbox: number
  orphanWebhookEvents: number
}

export type HandoverPreview = {
  mode: HandoverResetMode
  remove: HandoverRemoveCounts
  preserve: HandoverPreserveCounts
  alreadyClean: boolean
  actorPreserved: true
  warning: string
}

export type HandoverVerification = {
  customerCountsZero: boolean
  orphanFinanceFks: Record<string, number>
  orphanFinanceFksZero: boolean
  actorStillPrivileged: boolean
  staffUsersRemaining: number
  historicalTradesUnchanged: boolean
  historicalDailyReturnsUnchanged: boolean
  historicalMonthsUnchanged: boolean
  cmsDocumentsPreserved: boolean
  platformSettingsPreserved: boolean
  paymentMethodsPreserved: boolean
  fullResetArtifacts: FullResetCleanupCounts | null
}

export type HandoverResetResult = {
  mode: HandoverResetMode
  message: string
  alreadyClean: boolean
  backupPath: string | null
  removed: HandoverRemoveCounts
  preserved: HandoverPreserveCounts
  after: HandoverRemoveCounts
  historicalPerformance: {
    years: number
    tradingDays: number
    trades: number
    months: number
    periodLabel: string
  }
  verification: HandoverVerification
}

type ResetPlan = {
  targetIds: string[]
  targetEmails: string[]
  preview: HandoverPreview
  cleanup: FullResetCleanupCounts
}

const STAFF_ROLES: Role[] = ['ADMIN', 'SUPER_ADMIN']
const HISTORICAL_RETURN_STATUSES: HistoricalStatus[] = ['PUBLISHED', 'DISTRIBUTED']
const RESET_LOCK_KEY = 'client-handover-reset'
const WARNING_TEXT =
  'This permanently removes customer/demo operational data. Historical platform data, CMS content, settings, payment methods, and staff accounts are preserved.'

export function formatHistoricalPeriodLabel(months: number): string {
  if (months <= 0) return 'No published performance yet'
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`
  if (months % 12 === 0) {
    const years = months / 12
    return `${years} ${years === 1 ? 'year' : 'years'}`
  }
  const years = Number((months / 12).toFixed(1))
  return `${years} years`
}

function monthsToYears(months: number): number {
  if (months <= 0) return 0
  return Number((months / 12).toFixed(1))
}

function staffWhere(): Prisma.UserWhereInput {
  return {
    OR: [{ role: { in: STAFF_ROLES } }, { staffRole: { not: null } }],
  }
}

function customerWhere(actorId: string): Prisma.UserWhereInput {
  return {
    AND: [{ id: { not: actorId } }, { role: 'USER' }, { staffRole: null }],
  }
}

function isPrivilegedActor(actor: PrivilegedActor | null | undefined): actor is PrivilegedActor {
  return Boolean(actor && (STAFF_ROLES.includes(actor.role) || actor.staffRole !== null))
}

function sumValues(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function removeCountsAreZero(remove: HandoverRemoveCounts): boolean {
  return Object.values(remove).every((value) => value === 0)
}

function cleanupCountsAreZero(cleanup: FullResetCleanupCounts): boolean {
  return Object.values(cleanup).every((value) => value === 0)
}

async function countHistoricalMonths(client: QueryClient): Promise<number> {
  const days = await client.dailyReturn.findMany({
    where: { status: { in: HISTORICAL_RETURN_STATUSES } },
    select: { date: true },
    orderBy: { date: 'asc' },
  })
  return new Set(days.map((day) => day.date.toISOString().slice(0, 7))).size
}

async function countNonZeroWallets(client: QueryClient, targetIds: string[]): Promise<number> {
  if (!targetIds.length) return 0
  return client.wallet.count({
    where: {
      userId: { in: targetIds },
      OR: [
        { balance: { not: 0 } },
        { availableBalance: { not: 0 } },
        { lockedBalance: { not: 0 } },
        { pendingBalance: { not: 0 } },
        { investedAmount: { not: 0 } },
        { totalProfit: { not: 0 } },
        { totalDeposited: { not: 0 } },
        { totalWithdrawn: { not: 0 } },
      ],
    },
  })
}

async function countFullResetCleanup(
  client: QueryClient,
  mode: HandoverResetMode,
  targetIds: string[],
): Promise<FullResetCleanupCounts> {
  if (mode !== 'FULL_HANDOVER_RESET') {
    return {
      reportJobs: 0,
      reconciliationRuns: 0,
      orphanEmailOutbox: 0,
      orphanWebhookEvents: 0,
    }
  }

  const reportJobs = await client.reportJob.count({
    where: {
      OR: [{ requestedById: null }, { requestedById: { in: targetIds } }],
    },
  })
  const reconciliationRuns = await client.reconciliationRun.count()
  const orphanEmailOutbox = await client.emailOutbox.count({ where: { userId: null } })
  const orphanWebhookEvents = await client.paymentWebhookEvent.count({
    where: { depositId: null, withdrawalId: null },
  })

  return {
    reportJobs,
    reconciliationRuns,
    orphanEmailOutbox,
    orphanWebhookEvents,
  }
}

async function buildResetPlan(
  client: QueryClient,
  mode: HandoverResetMode,
  actorId: string,
): Promise<ResetPlan> {
  const targets = await client.user.findMany({
    where: customerWhere(actorId),
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  })
  const targetIds = targets.map((target) => target.id)
  const targetEmails = targets.map((target) => target.email)
  const userFilter = { userId: { in: targetIds } }

  const users = targetIds.length
  const wallets = targetIds.length ? await client.wallet.count({ where: userFilter }) : 0
  const deposits = targetIds.length ? await client.deposit.count({ where: userFilter }) : 0
  const withdrawals = targetIds.length ? await client.withdrawal.count({ where: userFilter }) : 0
  const transactions = targetIds.length ? await client.transaction.count({ where: userFilter }) : 0
  const ledgerEntries = targetIds.length
    ? await client.ledgerEntry.count({
        where: { transaction: { userId: { in: targetIds } } },
      })
    : 0
  const balances = await countNonZeroWallets(client, targetIds)
  const kycSubmissions = targetIds.length ? await client.kycSubmission.count({ where: userFilter }) : 0
  const kycDocuments = targetIds.length
    ? await client.kycDocument.count({ where: { submission: { userId: { in: targetIds } } } })
    : 0
  const kycReviews = targetIds.length
    ? await client.kycReview.count({ where: { submission: { userId: { in: targetIds } } } })
    : 0
  const kycHistory = targetIds.length
    ? await client.kycHistory.count({ where: { submission: { userId: { in: targetIds } } } })
    : 0
  const kycRecords = kycSubmissions + kycDocuments + kycReviews + kycHistory
  const notifications = targetIds.length ? await client.notification.count({ where: userFilter }) : 0
  const supportTickets = targetIds.length ? await client.supportTicket.count({ where: userFilter }) : 0
  const sessions = targetIds.length ? await client.session.count({ where: userFilter }) : 0

  const supportMessages = targetIds.length
    ? await client.supportMessage.count({ where: { ticket: { userId: { in: targetIds } } } })
    : 0
  const activityLogs = targetIds.length ? await client.activityLog.count({ where: userFilter }) : 0
  const tradeAllocations = targetIds.length ? await client.tradeAllocation.count({ where: userFilter }) : 0
  const profitDistributions = targetIds.length
    ? await client.profitDistribution.count({ where: userFilter })
    : 0
  const portfolioSnapshots = targetIds.length
    ? await client.portfolioSnapshot.count({ where: userFilter })
    : 0
  const investorPerformance = targetIds.length
    ? await client.investorPerformance.count({ where: userFilter })
    : 0
  const performanceMetric = targetIds.length
    ? await client.performanceMetric.count({ where: userFilter })
    : 0
  const emailOutbox = targetIds.length ? await client.emailOutbox.count({ where: userFilter }) : 0
  const transactionHistory = targetIds.length
    ? await client.transactionHistory.count({ where: userFilter })
    : 0
  const payoutMethods = targetIds.length ? await client.payoutMethod.count({ where: userFilter }) : 0
  const verificationTokens = targetIds.length
    ? await client.verificationToken.count({ where: userFilter })
    : 0
  const userProfiles = targetIds.length ? await client.userProfile.count({ where: userFilter }) : 0
  const nonSystemLedgerAccounts = targetIds.length
    ? await client.ledgerAccount.count({ where: { userId: { in: targetIds }, isSystem: false } })
    : 0

  const historicalMonths = await countHistoricalMonths(client)
  const preserve: HandoverPreserveCounts = {
    staffUsers: await client.user.count({ where: staffWhere() }),
    historicalTrades: await client.trade.count({ where: { isPublic: true, status: 'CLOSED' } }),
    historicalDailyReturns: await client.dailyReturn.count({
      where: { status: { in: HISTORICAL_RETURN_STATUSES } },
    }),
    historicalMonths,
    yearsOfPerformance: monthsToYears(historicalMonths),
    historicalPeriodLabel: formatHistoricalPeriodLabel(historicalMonths),
    cmsDocuments: await client.cmsDocument.count(),
    platformSettings: await client.platformSetting.count(),
    paymentMethods: await client.paymentMethod.count(),
  }

  const remove: HandoverRemoveCounts = {
    users,
    wallets,
    deposits,
    withdrawals,
    ledgerEntries,
    transactions,
    balances,
    kycRecords,
    notifications,
    supportTickets,
    sessions,
    otherUserGenerated: sumValues([
      supportMessages,
      activityLogs,
      tradeAllocations,
      profitDistributions,
      portfolioSnapshots,
      investorPerformance,
      performanceMetric,
      emailOutbox,
      transactionHistory,
      payoutMethods,
      verificationTokens,
      userProfiles,
      nonSystemLedgerAccounts,
    ]),
  }

  const cleanup = await countFullResetCleanup(client, mode, targetIds)

  return {
    targetIds,
    targetEmails,
    cleanup,
    preview: {
      mode,
      remove,
      preserve,
      alreadyClean: removeCountsAreZero(remove) && cleanupCountsAreZero(cleanup),
      actorPreserved: true,
      warning: WARNING_TEXT,
    },
  }
}

async function writeBackupSnapshot(input: {
  mode: HandoverResetMode
  actorId: string
  preview: HandoverPreview
  targetUserEmails: string[]
  cleanup: FullResetCleanupCounts
}): Promise<string> {
  const dir = path.resolve(env.UPLOAD_ROOT, 'handover-backups')
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(dir, `handover-${input.mode.toLowerCase()}-${stamp}.json`)
  const payload = {
    createdAt: new Date().toISOString(),
    mode: input.mode,
    actorId: input.actorId,
    note: 'Operational snapshot only — contains counts and emails, never secrets.',
    preview: input.preview,
    cleanup: input.cleanup,
    targetUserEmails: input.targetUserEmails,
  }
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
  return filePath
}

async function deleteOperationalData(
  tx: Prisma.TransactionClient,
  plan: ResetPlan,
): Promise<void> {
  const { targetIds, cleanup, preview } = plan
  if (!targetIds.length && preview.mode === 'TEST_DATA_RESET') return

  const userIn = { in: targetIds }

  if (targetIds.length) {
    const targetUsers = await tx.user.findMany({
      where: { id: userIn },
      select: { id: true, role: true, staffRole: true },
    })
    if (targetUsers.some((user) => user.role !== 'USER' || user.staffRole !== null)) {
      throw new Error('Targeting safety check failed: a non-customer user was included.')
    }

    const deposits = await tx.deposit.findMany({
      where: { userId: userIn },
      select: { id: true },
    })
    const withdrawals = await tx.withdrawal.findMany({
      where: { userId: userIn },
      select: { id: true },
    })
    const txnIds = (
      await tx.transaction.findMany({
        where: { userId: userIn },
        select: { id: true },
      })
    ).map((txn) => txn.id)
    const depositIds = deposits.map((deposit) => deposit.id)
    const withdrawalIds = withdrawals.map((withdrawal) => withdrawal.id)

    if (depositIds.length || withdrawalIds.length) {
      const depositOrWithdrawalClauses = [
        depositIds.length ? { depositId: { in: depositIds } } : undefined,
        withdrawalIds.length ? { withdrawalId: { in: withdrawalIds } } : undefined,
      ].filter(Boolean) as Prisma.PaymentWebhookEventWhereInput[]
      await tx.paymentWebhookEvent.deleteMany({ where: { OR: depositOrWithdrawalClauses } })
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

    await tx.profitDistribution.deleteMany({ where: { userId: userIn } })
    await tx.tradeAllocation.deleteMany({ where: { userId: userIn } })
    await tx.portfolioSnapshot.deleteMany({ where: { userId: userIn } })
    await tx.investorPerformance.deleteMany({ where: { userId: userIn } })
    await tx.performanceMetric.deleteMany({ where: { userId: userIn } })

    await tx.emailOutbox.deleteMany({ where: { userId: userIn } })
    await tx.transactionHistory.deleteMany({ where: { userId: userIn } })

    if (txnIds.length) {
      await tx.$executeRawUnsafe(
        'ALTER TABLE "ledger_entries" DISABLE TRIGGER ledger_entries_no_update',
      )
      try {
        await tx.ledgerEntry.deleteMany({ where: { transactionId: { in: txnIds } } })
      } finally {
        await tx.$executeRawUnsafe(
          'ALTER TABLE "ledger_entries" ENABLE TRIGGER ledger_entries_no_update',
        )
      }
    }

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

    await tx.auditLog.updateMany({
      where: { targetUserId: userIn },
      data: { targetUserId: null },
    })
    await tx.activityLog.updateMany({
      where: { actorId: userIn },
      data: { actorId: null },
    })
    await tx.user.updateMany({
      where: { referredById: userIn },
      data: { referredById: null },
    })

    await tx.user.deleteMany({
      where: {
        id: userIn,
        role: 'USER',
        staffRole: null,
      },
    })
  }

  if (plan.preview.mode === 'FULL_HANDOVER_RESET') {
    if (cleanup.reportJobs > 0) {
      await tx.reportJob.deleteMany({
        where: {
          OR: [{ requestedById: null }, { requestedById: { in: targetIds } }],
        },
      })
    }
    if (cleanup.reconciliationRuns > 0) {
      await tx.reconciliationRun.deleteMany({})
    }
    if (cleanup.orphanEmailOutbox > 0) {
      await tx.emailOutbox.deleteMany({ where: { userId: null } })
    }
    if (cleanup.orphanWebhookEvents > 0) {
      await tx.paymentWebhookEvent.deleteMany({
        where: { depositId: null, withdrawalId: null },
      })
    }
  }
}

async function countOrphanUserForeignKeys(
  tx: Prisma.TransactionClient,
): Promise<Record<string, number>> {
  const countForTable = async (tableName: string): Promise<number> => {
    const table = Prisma.raw(`"${tableName}"`)
    const rows = await tx.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM ${table} t
      LEFT JOIN "users" u ON u.id = t."user_id"
      WHERE t."user_id" IS NOT NULL AND u.id IS NULL
    `)
    return Number(rows[0]?.count ?? 0)
  }

  const counts = {
    wallets: await countForTable('wallets'),
    ledgerAccounts: await countForTable('ledger_accounts'),
    transactions: await countForTable('transactions'),
    deposits: await countForTable('deposits'),
    withdrawals: await countForTable('withdrawals'),
    payoutMethods: await countForTable('payout_methods'),
    profitDistributions: await countForTable('profit_distributions'),
    tradeAllocations: await countForTable('trade_allocations'),
    portfolioSnapshots: await countForTable('portfolio_snapshots'),
    investorPerformances: await countForTable('investor_performances'),
    performanceMetrics: await countForTable('performance_metrics'),
    transactionHistory: await countForTable('transaction_histories'),
    emailOutbox: await countForTable('email_outbox'),
  }

  return counts
}

function buildHistoricalPerformance(preserve: HandoverPreserveCounts) {
  return {
    years: preserve.yearsOfPerformance,
    tradingDays: preserve.historicalDailyReturns,
    trades: preserve.historicalTrades,
    months: preserve.historicalMonths,
    periodLabel: preserve.historicalPeriodLabel,
  }
}

function createAlreadyCleanVerification(preview: HandoverPreview): HandoverVerification {
  return {
    customerCountsZero: true,
    orphanFinanceFks: {},
    orphanFinanceFksZero: true,
    actorStillPrivileged: true,
    staffUsersRemaining: preview.preserve.staffUsers,
    historicalTradesUnchanged: true,
    historicalDailyReturnsUnchanged: true,
    historicalMonthsUnchanged: true,
    cmsDocumentsPreserved: true,
    platformSettingsPreserved: true,
    paymentMethodsPreserved: true,
    fullResetArtifacts: preview.mode === 'FULL_HANDOVER_RESET'
      ? {
          reportJobs: 0,
          reconciliationRuns: 0,
          orphanEmailOutbox: 0,
          orphanWebhookEvents: 0,
        }
      : null,
  }
}

async function verifyResetOutcome(
  tx: Prisma.TransactionClient,
  input: {
    actorId: string
    mode: HandoverResetMode
    before: HandoverPreview
  },
): Promise<{ after: HandoverPreview; verification: HandoverVerification }> {
  const afterPlan = await buildResetPlan(tx, input.mode, input.actorId)
  const actorAfter = await tx.user.findUnique({
    where: { id: input.actorId },
    select: { id: true, role: true, staffRole: true },
  })
  const orphanFinanceFks = await countOrphanUserForeignKeys(tx)
  const customerCountsZero = removeCountsAreZero(afterPlan.preview.remove)
  const orphanFinanceFksZero = Object.values(orphanFinanceFks).every((value) => value === 0)
  const actorStillPrivileged = isPrivilegedActor(actorAfter)
  const staffUsersRemaining = afterPlan.preview.preserve.staffUsers
  const historicalTradesUnchanged =
    afterPlan.preview.preserve.historicalTrades === input.before.preserve.historicalTrades
  const historicalDailyReturnsUnchanged =
    afterPlan.preview.preserve.historicalDailyReturns === input.before.preserve.historicalDailyReturns
  const historicalMonthsUnchanged =
    afterPlan.preview.preserve.historicalMonths === input.before.preserve.historicalMonths
  const cmsDocumentsPreserved =
    afterPlan.preview.preserve.cmsDocuments >= input.before.preserve.cmsDocuments
  const platformSettingsPreserved =
    afterPlan.preview.preserve.platformSettings >= input.before.preserve.platformSettings
  const paymentMethodsPreserved =
    afterPlan.preview.preserve.paymentMethods >= input.before.preserve.paymentMethods

  if (!customerCountsZero) throw new Error('Post-reset verification failed: customer counts remain.')
  if (!orphanFinanceFksZero) {
    throw new Error('Post-reset verification failed: orphan finance user references remain.')
  }
  if (!actorStillPrivileged) {
    throw new Error('Post-reset verification failed: acting staff user lost privileges.')
  }
  if (staffUsersRemaining < 1) {
    throw new Error('Post-reset verification failed: no staff users remain.')
  }
  if (!historicalTradesUnchanged || !historicalDailyReturnsUnchanged || !historicalMonthsUnchanged) {
    throw new Error('Post-reset verification failed: historical performance data changed.')
  }
  if (!cmsDocumentsPreserved || !platformSettingsPreserved || !paymentMethodsPreserved) {
    throw new Error('Post-reset verification failed: preserved configuration counts were reduced.')
  }
  if (input.mode === 'FULL_HANDOVER_RESET' && !cleanupCountsAreZero(afterPlan.cleanup)) {
    throw new Error('Post-reset verification failed: full handover cleanup artifacts remain.')
  }

  return {
    after: afterPlan.preview,
    verification: {
      customerCountsZero,
      orphanFinanceFks,
      orphanFinanceFksZero,
      actorStillPrivileged,
      staffUsersRemaining,
      historicalTradesUnchanged,
      historicalDailyReturnsUnchanged,
      historicalMonthsUnchanged,
      cmsDocumentsPreserved,
      platformSettingsPreserved,
      paymentMethodsPreserved,
      fullResetArtifacts: input.mode === 'FULL_HANDOVER_RESET' ? afterPlan.cleanup : null,
    },
  }
}

async function recordAuditSafe(input: Parameters<typeof auditService.record>[0]) {
  try {
    await auditService.record(input)
  } catch (error) {
    logger.warn({ error, action: input.action, module: input.module }, 'Audit log write failed')
  }
}

export const handoverResetService = {
  async preview(mode: HandoverResetMode, actorId: string): Promise<HandoverPreview> {
    const plan = await buildResetPlan(prisma, mode, actorId)
    return plan.preview
  },

  async execute(input: {
    mode: HandoverResetMode
    actorId: string
    confirmationPhrase: string
    confirm: boolean
    backupAcknowledged: true
    ctx?: RequestCtx
  }): Promise<HandoverResetResult> {
    if (!input.confirm) {
      throw badRequest('Second confirmation required. Set confirm=true to proceed.')
    }
    if (input.confirmationPhrase.trim() !== HANDOVER_CONFIRM_PHRASE) {
      throw badRequest(`Confirmation phrase mismatch. Type exactly: ${HANDOVER_CONFIRM_PHRASE}`)
    }
    if (input.backupAcknowledged !== true) {
      throw badRequest('Backup acknowledgement is required.')
    }

    const actor = await prisma.user.findUnique({
      where: { id: input.actorId },
      select: { id: true, role: true, staffRole: true, email: true },
    })
    if (!isPrivilegedActor(actor)) {
      throw badRequest('Only an authenticated admin/staff operator can run handover reset.')
    }

    let previewBefore: HandoverPreview | null = null
    let attemptedRemove: HandoverRemoveCounts | null = null
    let attemptedPreserve: HandoverPreserveCounts | null = null
    let cleanupBefore: FullResetCleanupCounts | null = null
    let backupPath: string | null = null

    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${RESET_LOCK_KEY}))`

          const actorInside = await tx.user.findUnique({
            where: { id: input.actorId },
            select: { id: true, role: true, staffRole: true, email: true },
          })
          if (!isPrivilegedActor(actorInside)) {
            throw new Error('Acting user is no longer privileged to run handover reset.')
          }

          const plan = await buildResetPlan(tx, input.mode, input.actorId)
          previewBefore = plan.preview
          attemptedRemove = plan.preview.remove
          attemptedPreserve = plan.preview.preserve
          cleanupBefore = plan.cleanup

          if (plan.preview.alreadyClean) {
            return {
              kind: 'already-clean' as const,
              result: {
                mode: input.mode,
                message:
                  'No customer/demo data remains. Historical platform data and configuration are preserved.',
                alreadyClean: true,
                backupPath: null,
                removed: plan.preview.remove,
                preserved: plan.preview.preserve,
                after: plan.preview.remove,
                historicalPerformance: buildHistoricalPerformance(plan.preview.preserve),
                verification: createAlreadyCleanVerification(plan.preview),
              },
            }
          }

          backupPath = await writeBackupSnapshot({
            mode: input.mode,
            actorId: input.actorId,
            preview: plan.preview,
            targetUserEmails: plan.targetEmails,
            cleanup: plan.cleanup,
          })

          await deleteOperationalData(tx, plan)
          const verified = await verifyResetOutcome(tx, {
            actorId: input.actorId,
            mode: input.mode,
            before: plan.preview,
          })

          return {
            kind: 'completed' as const,
            result: {
              mode: input.mode,
              message: 'Client handover reset completed.',
              alreadyClean: false,
              backupPath: backupPath ? path.basename(backupPath) : null,
              removed: plan.preview.remove,
              preserved: plan.preview.preserve,
              after: verified.after.remove,
              historicalPerformance: buildHistoricalPerformance(plan.preview.preserve),
              verification: verified.verification,
            },
          }
        },
        {
          maxWait: 30_000,
          timeout: 180_000,
        },
      )

      if (outcome.result.alreadyClean) {
        await recordAuditSafe({
          actorId: input.actorId,
          action: 'Client handover reset skipped',
          module: 'handover',
          reason: `${input.mode} already clean`,
          ip: input.ctx?.ip,
          userAgent: input.ctx?.userAgent,
          newValue: {
            mode: input.mode,
            alreadyClean: true,
            remove: outcome.result.removed,
            preserve: outcome.result.preserved,
          },
        })
        return outcome.result
      }

      await recordAuditSafe({
        actorId: input.actorId,
        action: 'Client handover reset executed',
        module: 'handover',
        reason: `${input.mode} completed`,
        ip: input.ctx?.ip,
        userAgent: input.ctx?.userAgent,
        newValue: {
          mode: input.mode,
          removed: outcome.result.removed,
          preserved: outcome.result.preserved,
          backupPath: outcome.result.backupPath,
          verification: outcome.result.verification,
        },
      })

      return outcome.result
    } catch (error) {
      logger.error(
        {
          error,
          actorId: input.actorId,
          mode: input.mode,
          previewBefore,
          backupPath: backupPath ? path.basename(backupPath) : null,
        },
        'Client handover reset failed',
      )

      await recordAuditSafe({
        actorId: input.actorId,
        action: 'Client handover reset failed',
        module: 'handover',
        reason: `${input.mode} failed`,
        ip: input.ctx?.ip,
        userAgent: input.ctx?.userAgent,
        newValue: {
          mode: input.mode,
          attemptedRemove,
          attemptedPreserve,
          cleanup: cleanupBefore,
          backupPath: backupPath ? path.basename(backupPath) : null,
        },
      })

      if (error instanceof AppError) throw error
      throw internalError('Client handover could not be completed. No changes were committed.')
    }
  },
}
