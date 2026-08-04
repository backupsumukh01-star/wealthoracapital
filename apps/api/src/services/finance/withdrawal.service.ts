import { randomUUID } from 'node:crypto'
import type { Prisma, WithdrawalStatus } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { notificationService } from '../notification.service.js'
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js'
import { d, moneyDisplay, moneyString } from '../../utils/money.js'
import { mapPayoutMethod, mapWithdrawal } from './finance.mappers.js'
import { ledgerService } from './ledger.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

const DEFAULT_MIN = d('20')
const DEFAULT_MAX = d('100000')
const DEFAULT_FEE_PCT = d('0')
const DAILY_LIMIT = d('50000')

function withdrawalRef(): string {
  return `WD-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

async function requireActiveInvestor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, kycStatus: true },
  })
  if (!user) throw notFound('User not found.')
  if (user.status !== 'ACTIVE') throw forbidden('Account is not active.')
  if (user.kycStatus !== 'APPROVED') throw forbidden('KYC approval is required for withdrawals.')
  return user
}

export const withdrawalService = {
  async limits(userId: string) {
    await requireActiveInvestor(userId)
    const wallet = await ledgerService.getInvestmentWallet(userId)
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    const withdrawnToday = await prisma.withdrawal.aggregate({
      where: {
        userId,
        createdAt: { gte: start },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      _sum: { amount: true },
    })
    const used = d(withdrawnToday._sum.amount ?? 0)
    const remaining = DecimalMax(DAILY_LIMIT.minus(used), d(0))
    const available = d(wallet.availableBalance)
    const max = DecimalMin(DEFAULT_MAX, available, remaining)

    return {
      min: moneyDisplay(DEFAULT_MIN),
      max: moneyDisplay(max),
      dailyRemaining: moneyDisplay(remaining),
      feePct: moneyDisplay(DEFAULT_FEE_PCT),
      availableBalance: moneyDisplay(available),
    }
  },

  async listPayoutMethods(userId: string) {
    await requireActiveInvestor(userId)
    let methods = await prisma.payoutMethod.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    if (methods.length === 0) {
      const created = await prisma.payoutMethod.create({
        data: {
          userId,
          label: 'Primary USDT TRC20',
          type: 'USDT_TRC20',
          details: { address: 'PENDING_USER_SETUP', network: 'TRC20' },
          maskedDetails: 'USDT TRC20 ••••• setup required',
          isDefault: true,
          isVerified: false,
        },
      })
      methods = [created]
    }
    return methods.map(mapPayoutMethod)
  },

  async list(
    userId: string,
    query: { status?: WithdrawalStatus; cursor?: string; limit?: number },
  ) {
    await requireActiveInvestor(userId)
    const limit = Math.min(query.limit ?? 20, 100)
    const items = await prisma.withdrawal.findMany({
      where: { userId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })
    return {
      items: items.map(mapWithdrawal),
      nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null,
    }
  },

  async get(userId: string, id: string) {
    const row = await prisma.withdrawal.findFirst({ where: { id, userId } })
    if (!row) throw notFound('Withdrawal not found.')
    return mapWithdrawal(row)
  },

  async create(
    userId: string,
    body: { amount: string; payoutMethodId: string; idempotencyKey: string },
    context: Ctx,
  ) {
    await requireActiveInvestor(userId)
    const existing = await prisma.withdrawal.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
    })
    if (existing) {
      if (existing.userId !== userId) throw conflict('Idempotency key conflict.')
      return mapWithdrawal(existing)
    }

    const amount = d(body.amount)
    if (!amount.isFinite() || amount.lte(0)) throw badRequest('Invalid withdrawal amount.')
    if (amount.lt(DEFAULT_MIN)) throw badRequest(`Minimum withdrawal is ${moneyDisplay(DEFAULT_MIN)}.`)
    if (amount.gt(DEFAULT_MAX)) throw badRequest(`Maximum withdrawal is ${moneyDisplay(DEFAULT_MAX)}.`)

    const payout = await prisma.payoutMethod.findFirst({
      where: { id: body.payoutMethodId, userId, deletedAt: null },
    })
    if (!payout) throw badRequest('Payout method not found.')

    const limits = await this.limits(userId)
    if (amount.gt(d(limits.dailyRemaining))) {
      throw badRequest('Daily withdrawal limit exceeded.')
    }
    if (amount.gt(d(limits.max))) {
      throw badRequest('Amount exceeds available balance or limits.')
    }

    const fee = amount.mul(DEFAULT_FEE_PCT).div(100)
    const net = amount.minus(fee)
    const wallet = await ledgerService.getInvestmentWallet(userId)

    const withdrawal = await prisma.$transaction(async (tx) => {
      const created = await tx.withdrawal.create({
        data: {
          reference: withdrawalRef(),
          userId,
          walletId: wallet.id,
          payoutMethodId: payout.id,
          amount: moneyString(amount),
          fee: moneyString(fee),
          netAmount: moneyString(net),
          status: 'PENDING',
          destinationLabel: payout.label,
          destinationSnapshot: {
            label: payout.label,
            type: payout.type,
            details: payout.details,
            maskedDetails: payout.maskedDetails,
          },
          idempotencyKey: body.idempotencyKey,
        },
      })

      const txn = await ledgerService.lockFunds(tx, {
        userId,
        walletId: wallet.id,
        amount,
        description: `Withdrawal ${created.reference} locked`,
        referenceType: 'WITHDRAWAL',
        referenceId: created.id,
        createdById: userId,
        idempotencyKey: `withdrawal:${created.id}:lock`,
      })

      await tx.withdrawal.update({
        where: { id: created.id },
        data: { transactionId: txn.id, status: 'UNDER_REVIEW' },
      })

      await tx.approvalQueue.create({
        data: {
          entityType: 'WITHDRAWAL',
          entityId: created.id,
          withdrawalId: created.id,
          status: 'PENDING',
          requiredRole: 'FINANCE',
        },
      })
      await tx.transactionHistory.create({
        data: {
          transactionId: txn.id,
          userId,
          event: 'WITHDRAWAL_SUBMITTED',
          status: 'UNDER_REVIEW',
          amount: moneyString(amount),
          currency: 'USD',
          message: `Withdrawal ${created.reference} submitted`,
        },
      })

      return tx.withdrawal.findUniqueOrThrow({ where: { id: created.id } })
    })

    await activityService.record({
      userId,
      actorId: userId,
      kind: 'WITHDRAWAL_SUBMITTED',
      title: 'Withdrawal submitted',
      description: withdrawal.reference,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'withdrawal.create',
      module: 'finance',
      newValue: { id: withdrawal.id, amount: moneyDisplay(amount) },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await notificationService.notify({
      userId,
      kind: 'FINANCE',
      title: 'Withdrawal submitted',
      body: `Your withdrawal ${withdrawal.reference} is under review.`,
      metadata: { type: 'WITHDRAWAL_SUBMITTED', withdrawalId: withdrawal.id },
    })

    return mapWithdrawal(withdrawal)
  },

  async cancel(userId: string, id: string, context: Ctx) {
    const row = await prisma.withdrawal.findFirst({ where: { id, userId } })
    if (!row) throw notFound('Withdrawal not found.')
    if (!['PENDING', 'UNDER_REVIEW'].includes(row.status)) {
      throw forbidden('Only pending withdrawals can be cancelled.')
    }

    const updated = await prisma.$transaction(async (tx) => {
      await ledgerService.unlockFunds(tx, {
        userId,
        walletId: row.walletId,
        amount: d(row.amount),
        description: `Withdrawal ${row.reference} cancelled`,
        referenceType: 'WITHDRAWAL',
        referenceId: row.id,
        createdById: userId,
        idempotencyKey: `withdrawal:${row.id}:cancel`,
      })
      const next = await tx.withdrawal.update({
        where: { id: row.id },
        data: { status: 'CANCELLED' },
      })
      await tx.approvalQueue.updateMany({
        where: { withdrawalId: row.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        data: { status: 'CANCELLED', resolvedAt: new Date() },
      })
      return next
    })

    await activityService.record({
      userId,
      actorId: userId,
      kind: 'WITHDRAWAL_CANCELLED',
      title: 'Withdrawal cancelled',
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'withdrawal.cancel',
      module: 'finance',
      oldValue: { status: row.status },
      newValue: { status: 'CANCELLED' },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapWithdrawal(updated)
  },

  async adminList(query: {
    q?: string
    status?: WithdrawalStatus
    from?: Date
    to?: Date
    minAmount?: string
    maxAmount?: string
    reviewerId?: string
    page: number
    limit: number
  }) {
    const where: Prisma.WithdrawalWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.reviewerId ? { reviewedById: query.reviewerId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.minAmount || query.maxAmount
        ? {
            amount: {
              ...(query.minAmount ? { gte: query.minAmount } : {}),
              ...(query.maxAmount ? { lte: query.maxAmount } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { reference: { contains: query.q.toUpperCase() } },
              { transactionRef: { contains: query.q } },
              { user: { email: { contains: query.q, mode: 'insensitive' } } },
              { user: { firstName: { contains: query.q, mode: 'insensitive' } } },
              { user: { lastName: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const skip = (query.page - 1) * query.limit
    const [items, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          payoutMethod: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.withdrawal.count({ where }),
    ])

    return {
      items: items.map((row) => ({
        ...mapWithdrawal(row),
        user: row.user,
        payoutMethod: mapPayoutMethod(row.payoutMethod),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  },

  async adminGet(id: string) {
    const row = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true } },
        payoutMethod: true,
        reviews: { orderBy: { createdAt: 'desc' } },
        queue: true,
      },
    })
    if (!row) throw notFound('Withdrawal not found.')
    return {
      ...mapWithdrawal(row),
      user: row.user,
      internalNotes: row.internalNotes,
      payoutMethod: mapPayoutMethod(row.payoutMethod),
      destinationSnapshot: row.destinationSnapshot,
      reviews: row.reviews,
      queue: row.queue,
    }
  },

  async review(
    actorId: string,
    withdrawalId: string,
    body: {
      decision: 'APPROVE' | 'REJECT' | 'PAID' | 'REQUEST_INFORMATION' | 'FORCE_COMPLETE' | 'FORCE_CANCEL'
      reason?: string
      transactionRef?: string
      internalNotes?: string
    },
    context: Ctx,
  ) {
    const row = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } })
    if (!row) throw notFound('Withdrawal not found.')

    if (body.decision === 'APPROVE') {
      if (!['PENDING', 'UNDER_REVIEW'].includes(row.status)) {
        throw badRequest('Withdrawal cannot be approved from the current status.')
      }
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.withdrawal.update({
          where: { id: row.id },
          data: {
            status: 'APPROVED',
            reviewedById: actorId,
            reviewedAt: new Date(),
            internalNotes: body.internalNotes ?? row.internalNotes,
          },
        })
        await tx.financeReview.create({
          data: {
            withdrawalId: row.id,
            reviewerId: actorId,
            decision: 'APPROVE',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        await tx.approvalQueue.updateMany({
          where: { withdrawalId: row.id },
          data: { status: 'IN_PROGRESS', assigneeId: actorId },
        })
        return next
      })

      await activityService.record({
        userId: row.userId,
        actorId,
        kind: 'WITHDRAWAL_APPROVED',
        title: 'Withdrawal approved',
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await auditService.record({
        actorId,
        targetUserId: row.userId,
        action: 'withdrawal.approve',
        module: 'finance',
        oldValue: { status: row.status },
        newValue: { status: 'APPROVED' },
        reason: body.reason,
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await notificationService.notify({
        userId: row.userId,
        kind: 'FINANCE',
        title: 'Withdrawal approved',
        body: `Withdrawal ${row.reference} was approved and will be processed.`,
        metadata: { type: 'WITHDRAWAL_APPROVED', withdrawalId: row.id },
      })
      return mapWithdrawal(updated)
    }

    if (body.decision === 'PAID' || body.decision === 'FORCE_COMPLETE') {
      if (!['APPROVED', 'PROCESSING', 'UNDER_REVIEW', 'PENDING'].includes(row.status)) {
        throw badRequest('Withdrawal cannot be completed from the current status.')
      }
      const updated = await prisma.$transaction(async (tx) => {
        // If still locked only (not completed), complete ledger debit once.
        const already = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey: `withdrawal:${row.id}:complete:locked` },
        })
        if (!already) {
          await ledgerService.completeWithdrawal(tx, {
            userId: row.userId,
            walletId: row.walletId,
            amount: d(row.amount),
            description: `Withdrawal ${row.reference} paid`,
            referenceType: 'WITHDRAWAL',
            referenceId: row.id,
            createdById: actorId,
            idempotencyKey: `withdrawal:${row.id}:complete`,
          })
        }
        const next = await tx.withdrawal.update({
          where: { id: row.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            reviewedById: actorId,
            reviewedAt: row.reviewedAt ?? new Date(),
            transactionRef: body.transactionRef ?? row.transactionRef,
            internalNotes: body.internalNotes ?? row.internalNotes,
          },
        })
        await tx.financeReview.create({
          data: {
            withdrawalId: row.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_COMPLETE' ? 'FORCE_COMPLETE' : 'PAID',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        await tx.approvalQueue.updateMany({
          where: { withdrawalId: row.id },
          data: { status: 'APPROVED', resolvedAt: new Date(), assigneeId: actorId },
        })
        return next
      })

      await activityService.record({
        userId: row.userId,
        actorId,
        kind: 'WITHDRAWAL_PAID',
        title: 'Withdrawal paid',
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await auditService.record({
        actorId,
        targetUserId: row.userId,
        action: 'withdrawal.paid',
        module: 'finance',
        oldValue: { status: row.status },
        newValue: { status: 'PAID' },
        reason: body.reason,
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await notificationService.notify({
        userId: row.userId,
        kind: 'FINANCE',
        title: 'Withdrawal paid',
        body: `Withdrawal ${row.reference} has been paid.`,
        metadata: { type: 'WITHDRAWAL_PAID', withdrawalId: row.id },
      })
      return mapWithdrawal(updated)
    }

    if (body.decision === 'REJECT' || body.decision === 'FORCE_CANCEL') {
      if (!body.reason && body.decision === 'REJECT') {
        throw badRequest('A rejection reason is required.')
      }
      const nextStatus = body.decision === 'FORCE_CANCEL' ? 'CANCELLED' : 'REJECTED'
      const updated = await prisma.$transaction(async (tx) => {
        if (['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'].includes(row.status)) {
          const completed = await tx.ledgerEntry.findFirst({
            where: { idempotencyKey: `withdrawal:${row.id}:complete:locked` },
          })
          if (!completed) {
            await ledgerService.unlockFunds(tx, {
              userId: row.userId,
              walletId: row.walletId,
              amount: d(row.amount),
              description: `Withdrawal ${row.reference} ${nextStatus.toLowerCase()}`,
              referenceType: 'WITHDRAWAL',
              referenceId: row.id,
              createdById: actorId,
              idempotencyKey: `withdrawal:${row.id}:${nextStatus.toLowerCase()}`,
            })
          }
        }
        const next = await tx.withdrawal.update({
          where: { id: row.id },
          data: {
            status: nextStatus,
            rejectionReason: body.reason ?? null,
            reviewedById: actorId,
            reviewedAt: new Date(),
            internalNotes: body.internalNotes ?? row.internalNotes,
          },
        })
        await tx.financeReview.create({
          data: {
            withdrawalId: row.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_CANCEL' ? 'FORCE_CANCEL' : 'REJECT',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        await tx.approvalQueue.updateMany({
          where: { withdrawalId: row.id },
          data: {
            status: body.decision === 'FORCE_CANCEL' ? 'CANCELLED' : 'REJECTED',
            resolvedAt: new Date(),
            assigneeId: actorId,
          },
        })
        return next
      })

      await activityService.record({
        userId: row.userId,
        actorId,
        kind: 'WITHDRAWAL_REJECTED',
        title: nextStatus === 'CANCELLED' ? 'Withdrawal cancelled' : 'Withdrawal rejected',
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await auditService.record({
        actorId,
        targetUserId: row.userId,
        action: `withdrawal.${body.decision.toLowerCase()}`,
        module: 'finance',
        oldValue: { status: row.status },
        newValue: { status: nextStatus },
        reason: body.reason,
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await notificationService.notify({
        userId: row.userId,
        kind: 'FINANCE',
        title: nextStatus === 'CANCELLED' ? 'Withdrawal cancelled' : 'Withdrawal rejected',
        body: body.reason ?? `Withdrawal ${row.reference} was ${nextStatus.toLowerCase()}.`,
        metadata: { type: 'WITHDRAWAL_REJECTED', withdrawalId: row.id },
      })
      return mapWithdrawal(updated)
    }

    if (body.decision === 'REQUEST_INFORMATION') {
      if (!body.reason) throw badRequest('A message is required.')
      const updated = await prisma.withdrawal.update({
        where: { id: row.id },
        data: {
          status: 'UNDER_REVIEW',
          internalNotes: body.internalNotes ?? row.internalNotes,
        },
      })
      await prisma.financeReview.create({
        data: {
          withdrawalId: row.id,
          reviewerId: actorId,
          decision: 'REQUEST_INFORMATION',
          reason: body.reason,
          internalNotes: body.internalNotes ?? null,
        },
      })
      await notificationService.notify({
        userId: row.userId,
        kind: 'FINANCE',
        title: 'More information needed',
        body: body.reason,
        metadata: { type: 'WITHDRAWAL_INFO_REQUESTED', withdrawalId: row.id },
      })
      return mapWithdrawal(updated)
    }

    throw badRequest('Unsupported decision.')
  },
}

function DecimalMax(a: ReturnType<typeof d>, b: ReturnType<typeof d>) {
  return a.gt(b) ? a : b
}
function DecimalMin(...values: Array<ReturnType<typeof d>>) {
  return values.reduce((min, v) => (v.lt(min) ? v : min))
}
