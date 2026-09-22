import { randomUUID } from 'node:crypto'

import type { Prisma, User } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { badRequest, forbidden, notFound } from '../utils/errors.js'
import { moneyDisplay } from '../utils/money.js'
import { auditService } from './audit.service.js'
import {
  PERMANENT_DELETE_AUDIT_ACTION,
  PERMANENT_DELETE_AUDIT_MODULE,
  buildPermanentDeleteSnapshot,
  isCompletedPermanentDeleteAudit,
  parsePermanentDeleteSnapshot,
  permanentDeleteAuditNewValue,
  permanentDeleteAuditReason,
} from './admin-user-deletion-audit.js'
import { cache } from './cache/index.js'
import { storage } from './storage/index.js'
import { sessionRepository } from '../repositories/session.repository.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

const CONFIRM_PHRASE = 'DELETE'

function crc32(buf: Buffer) {
  let crc = ~0
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]!
    for (let j = 0; j < 8; j += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return ~crc >>> 0
}

/** Minimal store-only ZIP (same pattern as historical-import templates). */
function zipStore(files: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const crc = crc32(file.data)
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(file.data.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    name.copy(local, 30)
    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(file.data.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    locals.push(local, file.data)
    centrals.push(central)
    offset += local.length + file.data.length
  }
  const centralBlob = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralBlob.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBlob, eocd])
}

function jsonFile(name: string, value: unknown) {
  return {
    name,
    data: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'),
  }
}

function money(v: unknown) {
  if (v == null) return moneyDisplay(0)
  return moneyDisplay(v as string | number)
}

/**
 * Permanent single-user deletion.
 *
 * Safety invariants (verified against Prisma schema):
 * - users.referred_by_id → ON DELETE SET NULL (descendants keep accounts)
 * - sales_attributions.user_id → CASCADE (only this user's attribution row)
 * - sales_attributions.salesman_id → RESTRICT (salesman never deleted)
 * - ReferralReward rows for referrer OR referee are removed explicitly before deposits
 *   (referee-side rows are the referrer's commission for THIS user only — not other users' accounts)
 * - Does NOT delete other User rows, Salesman rows, or unrelated SalesAttribution rows
 */
export const adminUserPermanentDeleteService = {
  confirmPhrase: CONFIRM_PHRASE,

  async assertDeletableTarget(actorId: string, userId: string) {
    const actor = await prisma.user.findFirst({
      where: { id: actorId, deletedAt: null },
      select: { id: true, role: true, staffRole: true },
    })
    if (!actor || (actor.role !== 'SUPER_ADMIN' && actor.staffRole !== 'SUPER_ADMIN')) {
      throw forbidden('Permanent user deletion requires SUPER_ADMIN.')
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) throw notFound('User not found.')
    if (existing.id === actorId) throw badRequest('You cannot delete your own account.')
    if (existing.role === 'SUPER_ADMIN' || existing.staffRole === 'SUPER_ADMIN') {
      throw forbidden('Cannot permanently delete a SUPER_ADMIN account.')
    }
    if (existing.role !== 'USER' || existing.staffRole != null) {
      throw forbidden('Permanent deletion is limited to investor (USER) accounts.')
    }
    return existing
  },

  /**
   * Build a downloadable ZIP of the selected user's records (no secrets/hashes).
   * Does not mutate data.
   */
  async buildExportArchive(actorId: string, userId: string) {
    const user = await this.assertDeletableTarget(actorId, userId)

    const [
      profile,
      sessions,
      wallets,
      deposits,
      withdrawals,
      payoutMethods,
      transactions,
      profitDistributions,
      tradeAllocations,
      kycSubmissions,
      referralAsReferrer,
      referralAsReferee,
      salesAttribution,
      notifications,
      activityLogs,
      supportTickets,
      portfolioSnapshots,
      investorPerformance,
      performanceMetrics,
      historicalImports,
      descendants,
    ] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
          lastUsedAt: true,
          ip: true,
          userAgent: true,
        },
      }),
      prisma.wallet.findMany({ where: { userId } }),
      prisma.deposit.findMany({ where: { userId } }),
      prisma.withdrawal.findMany({ where: { userId } }),
      prisma.payoutMethod.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId } }),
      prisma.profitDistribution.findMany({ where: { userId } }),
      prisma.tradeAllocation.findMany({ where: { userId } }),
      prisma.kycSubmission.findMany({
        where: { userId },
        include: {
          documents: {
            select: {
              id: true,
              documentType: true,
              side: true,
              status: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              storageKey: true,
              createdAt: true,
            },
          },
          reviews: {
            select: {
              id: true,
              decision: true,
              reason: true,
              createdAt: true,
              reviewerId: true,
            },
          },
        },
      }),
      prisma.referralReward.findMany({
        where: { referrerId: userId },
        select: {
          id: true,
          refereeId: true,
          sourceDepositId: true,
          rewardAmount: true,
          status: true,
          createdAt: true,
          redeemedAt: true,
        },
      }),
      prisma.referralReward.findMany({
        where: { refereeId: userId },
        select: {
          id: true,
          referrerId: true,
          sourceDepositId: true,
          rewardAmount: true,
          status: true,
          createdAt: true,
          redeemedAt: true,
        },
      }),
      prisma.salesAttribution.findUnique({
        where: { userId },
        select: {
          id: true,
          salesmanId: true,
          source: true,
          attributedAt: true,
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        select: { id: true, title: true, body: true, createdAt: true, readAt: true },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        select: {
          id: true,
          kind: true,
          title: true,
          description: true,
          createdAt: true,
        },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supportTicket.findMany({
        where: { userId },
        include: {
          messages: {
            select: { id: true, authorType: true, body: true, createdAt: true },
          },
        },
      }),
      prisma.portfolioSnapshot.findMany({ where: { userId } }),
      prisma.investorPerformance.findUnique({ where: { userId } }),
      prisma.performanceMetric.findMany({ where: { userId } }),
      prisma.historicalImport.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          fileName: true,
        },
      }),
      prisma.user.findMany({
        where: { referredById: userId },
        select: { id: true, email: true, referralCode: true },
      }),
    ])

    const manifest = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      exportedByAdminId: actorId,
      subjectUserId: user.id,
      note:
        'This archive contains records owned by the deleted subject only. Password hashes, 2FA secrets, refresh tokens, and platform secrets are excluded. Referral descendants listed under referral_descendants_preserved are NOT deleted.',
    }

    const account = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      timezone: user.timezone,
      role: user.role,
      status: user.status,
      kycStatus: user.kycStatus,
      referralCode: user.referralCode,
      referredById: user.referredById,
      googleLinked: Boolean(user.googleId),
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
      createdByAdminId: user.createdByAdminId,
      // intentionally omit: passwordHash, twoFactorSecret, googleId raw, avatarKey secrets
    }

    const zip = zipStore([
      jsonFile('manifest.json', manifest),
      jsonFile('account.json', account),
      jsonFile('profile.json', profile),
      jsonFile('sessions.json', sessions),
      jsonFile(
        'wallets.json',
        wallets.map((w) => ({
          id: w.id,
          kind: w.kind,
          balance: money(w.balance),
          availableBalance: money(w.availableBalance),
          lockedBalance: money(w.lockedBalance),
          investedAmount: money(w.investedAmount),
          totalDeposited: money(w.totalDeposited),
          totalWithdrawn: money(w.totalWithdrawn),
          totalProfit: money(w.totalProfit),
        })),
      ),
      jsonFile(
        'deposits.json',
        deposits.map((d) => ({
          id: d.id,
          reference: d.reference,
          amount: money(d.amount),
          status: d.status,
          createdAt: d.createdAt,
          reviewedAt: d.reviewedAt,
        })),
      ),
      jsonFile(
        'withdrawals.json',
        withdrawals.map((w) => ({
          id: w.id,
          reference: w.reference,
          amount: money(w.amount),
          status: w.status,
          createdAt: w.createdAt,
          reviewedAt: w.reviewedAt,
        })),
      ),
      jsonFile('payout_methods.json', payoutMethods),
      jsonFile(
        'transactions.json',
        transactions.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          amount: money(t.amount),
          createdAt: t.createdAt,
        })),
      ),
      jsonFile(
        'profit_distributions.json',
        profitDistributions.map((p) => ({
          id: p.id,
          amount: money(p.amount),
          date: p.date,
          isReversed: p.isReversed,
        })),
      ),
      jsonFile('trade_allocations.json', tradeAllocations),
      jsonFile('kyc.json', kycSubmissions),
      jsonFile('referral_rewards_as_referrer.json', referralAsReferrer),
      jsonFile('referral_rewards_as_referee.json', referralAsReferee),
      jsonFile('referral_descendants_preserved.json', {
        count: descendants.length,
        users: descendants.map((d) => ({
          id: d.id,
          email: d.email,
          referralCode: d.referralCode,
          note: 'These accounts are preserved; referredById will be cleared to null.',
        })),
      }),
      jsonFile('sales_attribution.json', salesAttribution),
      jsonFile('notifications.json', notifications),
      jsonFile('activity.json', activityLogs),
      jsonFile('support_tickets.json', supportTickets),
      jsonFile('portfolio_snapshots.json', portfolioSnapshots),
      jsonFile('investor_performance.json', investorPerformance),
      jsonFile('performance_metrics.json', performanceMetrics),
      jsonFile('historical_imports.json', historicalImports),
    ])

    const filename = `user-export-${user.id.slice(0, 8)}-${new Date()
      .toISOString()
      .slice(0, 10)}.zip`
    return { filename, contentType: 'application/zip' as const, body: zip }
  },

  /**
   * Permanently delete ONE investor by ID inside a transaction.
   * Collects storage keys first; deletes external files only after DB commit.
   */
  async permanentDelete(
    actorId: string,
    userId: string,
    input: {
      confirmPhrase: string
      exportAcknowledged: boolean
      reason?: string | null
    },
    context: Ctx,
  ) {
    if (input.confirmPhrase !== CONFIRM_PHRASE) {
      throw badRequest(`Type ${CONFIRM_PHRASE} to confirm permanent deletion.`)
    }
    if (!input.exportAcknowledged) {
      throw badRequest('Download the user data export before permanent deletion.')
    }

    const existing = await this.assertDeletableTarget(actorId, userId)
    const deletionRef = `del_${userId.slice(0, 8)}_${randomUUID().slice(0, 8)}`

    const actor = await prisma.user.findFirst({
      where: { id: actorId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    const identitySnapshot = buildPermanentDeleteSnapshot({
      user: {
        id: existing.id,
        email: existing.email,
        firstName: existing.firstName,
        lastName: existing.lastName,
        referralCode: existing.referralCode,
      },
      actor,
      deletionRef,
    })

    // Collect file keys before DB wipe (KYC docs + avatar).
    const [kycDocs, avatarKey] = await Promise.all([
      prisma.kycDocument.findMany({
        where: { submission: { userId } },
        select: { storageKey: true },
      }),
      Promise.resolve(existing.avatarKey),
    ])
    const storageKeys = [
      ...kycDocs.map((d) => d.storageKey).filter(Boolean),
      ...(avatarKey ? [avatarKey] : []),
    ]

    await sessionRepository.revokeAllForUser(userId)

    // Audit is written ONLY after a successful wipe so failed deletes never appear
    // in the Deleted Users list.
    await prisma.$transaction(
      async (tx) => {
        await this.deleteUserOwnedRecords(tx, userId, actorId)
      },
      { timeout: 180_000, maxWait: 20_000 },
    )

    await auditService.record({
      actorId,
      // User row is gone — do not connect targetUser; identity lives in JSON snapshot.
      targetUserId: null,
      action: PERMANENT_DELETE_AUDIT_ACTION,
      module: PERMANENT_DELETE_AUDIT_MODULE,
      oldValue: identitySnapshot,
      newValue: permanentDeleteAuditNewValue(deletionRef),
      reason: input.reason?.trim()
        ? `${input.reason.trim()} · ${permanentDeleteAuditReason(identitySnapshot)}`
        : permanentDeleteAuditReason(identitySnapshot),
      ip: context.ip,
      userAgent: context.userAgent,
    })

    // External files after successful commit — best effort; DB already clean.
    for (const key of storageKeys) {
      try {
        await storage.delete(key)
      } catch {
        // Do not fail the overall operation after commit; key may already be gone.
      }
    }

    await cache.del('admin:dashboard:ops-v6').catch(() => undefined)
    await cache.del('admin:dashboard:ops-v5').catch(() => undefined)

    return {
      id: userId,
      deleted: true as const,
      deletionRef,
      emailReleased: true as const,
    }
  },

  /**
   * Read-only Deleted Users audit list (successful permanent deletions only).
   * Does not restore users or return financial/KYC history.
   */
  async listDeleted(input: {
    q?: string
    page: number
    limit: number
  }) {
    const where: Prisma.AuditLogWhereInput = {
      action: PERMANENT_DELETE_AUDIT_ACTION,
      module: PERMANENT_DELETE_AUDIT_MODULE,
      newValue: {
        path: ['status'],
        equals: 'COMPLETED',
      },
      ...(input.q
        ? {
            OR: [
              { reason: { contains: input.q, mode: 'insensitive' } },
              {
                actor: {
                  OR: [
                    { email: { contains: input.q, mode: 'insensitive' } },
                    { firstName: { contains: input.q, mode: 'insensitive' } },
                    { lastName: { contains: input.q, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    }

    const skip = (input.page - 1) * input.limit
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: input.limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    const items = rows
      .filter((row) => isCompletedPermanentDeleteAudit(row))
      .map((row) => {
        const snapshot = parsePermanentDeleteSnapshot(row.oldValue)
        const actorLiveName = row.actor
          ? `${row.actor.firstName} ${row.actor.lastName}`.trim()
          : null
        return {
          id: row.id,
          deletionRef: snapshot?.deletionRef ?? null,
          deletedUserId: snapshot?.deletedUserId ?? null,
          displayName: snapshot?.displayName ?? null,
          username: snapshot?.username ?? null,
          email: snapshot?.email ?? null,
          deletedAt: row.createdAt.toISOString(),
          deletedBy: {
            id: snapshot?.deletedByAdminId || row.actorId,
            name: snapshot?.deletedByName || actorLiveName,
            email: snapshot?.deletedByEmail || row.actor?.email || null,
          },
        }
      })

    return {
      items,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
        hasNext: skip + rows.length < total,
      },
    }
  },

  async deleteUserOwnedRecords(
    tx: Prisma.TransactionClient,
    userId: string,
    actorId: string,
  ) {
    const [deposits, withdrawals] = await Promise.all([
      tx.deposit.findMany({ where: { userId }, select: { id: true } }),
      tx.withdrawal.findMany({ where: { userId }, select: { id: true } }),
    ])
    const depositIds = deposits.map((d) => d.id)
    const withdrawalIds = withdrawals.map((w) => w.id)
    const txnIds = (
      await tx.transaction.findMany({ where: { userId }, select: { id: true } })
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

    // Referral rewards for THIS user only (as referrer or as referee / source deposit).
    // Does not delete other users. Referee-side rows are commissions earned by the
    // referrer for THIS user's deposits — removed with the subject so FKs unlock.
    await tx.referralReward.deleteMany({
      where: {
        OR: [
          { referrerId: userId },
          { refereeId: userId },
          ...(depositIds.length ? [{ sourceDepositId: { in: depositIds } }] : []),
        ],
      },
    })

    await tx.supportMessage.deleteMany({ where: { ticket: { userId } } })
    await tx.supportTicket.deleteMany({ where: { userId } })
    await tx.notification.deleteMany({ where: { userId } })
    await tx.activityLog.deleteMany({ where: { userId } })

    await tx.kycHistory.deleteMany({ where: { submission: { userId } } })
    await tx.kycDocument.deleteMany({ where: { submission: { userId } } })
    await tx.kycReview.deleteMany({ where: { submission: { userId } } })
    await tx.kycSubmission.deleteMany({ where: { userId } })

    await tx.profitDistribution.deleteMany({ where: { userId } })
    await tx.tradeAllocation.deleteMany({ where: { userId } })
    await tx.portfolioSnapshot.deleteMany({ where: { userId } })
    await tx.investorPerformance.deleteMany({ where: { userId } })
    await tx.performanceMetric.deleteMany({ where: { userId } })

    await tx.emailOutbox.deleteMany({ where: { userId } })
    await tx.transactionHistory.deleteMany({ where: { userId } })

    if (txnIds.length) {
      await tx.$executeRawUnsafe(
        'ALTER TABLE "ledger_entries" DISABLE TRIGGER ledger_entries_no_update',
      )
      try {
        await tx.ledgerEntry.deleteMany({
          where: {
            OR: [{ transactionId: { in: txnIds } }, { wallet: { userId } }],
          },
        })
      } finally {
        await tx.$executeRawUnsafe(
          'ALTER TABLE "ledger_entries" ENABLE TRIGGER ledger_entries_no_update',
        )
      }
    }

    await tx.deposit.updateMany({ where: { userId }, data: { transactionId: null } })
    await tx.withdrawal.updateMany({ where: { userId }, data: { transactionId: null } })
    await tx.deposit.deleteMany({ where: { userId } })
    await tx.withdrawal.deleteMany({ where: { userId } })
    await tx.transaction.deleteMany({ where: { userId } })

    await tx.payoutMethod.deleteMany({ where: { userId } })
    await tx.ledgerAccount.deleteMany({ where: { userId, isSystem: false } })
    await tx.wallet.deleteMany({ where: { userId } })

    await tx.salesAttribution.deleteMany({ where: { userId } })

    await tx.historicalImport.deleteMany({ where: { userId } })
    // Preserve other investors' import rows that this user uploaded — reassign actor.
    await tx.historicalImport.updateMany({
      where: { uploadedById: userId },
      data: { uploadedById: actorId },
    })

    await tx.session.deleteMany({ where: { userId } })
    await tx.verificationToken.deleteMany({ where: { userId } })
    await tx.userProfile.deleteMany({ where: { userId } })

    await tx.auditLog.updateMany({
      where: { targetUserId: userId },
      data: { targetUserId: null },
    })
    await tx.activityLog.updateMany({
      where: { actorId: userId },
      data: { actorId: null },
    })
    await tx.kycReview.updateMany({
      where: { reviewerId: userId },
      data: { reviewerId: null },
    })
    await tx.financeReview.updateMany({
      where: { reviewerId: userId },
      data: { reviewerId: null },
    })
    await tx.approvalQueue.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null },
    })
    await tx.supportTicket.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null },
    })

    // Descendants keep their accounts; clear parent pointer (also DB ON DELETE SET NULL).
    await tx.user.updateMany({
      where: { referredById: userId },
      data: { referredById: null },
    })

    // Release unique email/phone, then hard-delete the row.
    const tombstone = `deleted_${userId.slice(0, 8)}_${Date.now()}`
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `${tombstone}@deleted.local`,
        phone: null,
        googleId: null,
        passwordHash: null,
        twoFactorSecret: null,
        avatarKey: null,
        referralCode: null,
        deletedAt: new Date(),
        status: 'ARCHIVED',
      },
    })
    await tx.user.delete({ where: { id: userId } })
  },
}

export type PermanentDeleteResult = Awaited<
  ReturnType<typeof adminUserPermanentDeleteService.permanentDelete>
>

/** Exported for unit tests — type anchor. */
export type DeletableUser = User
