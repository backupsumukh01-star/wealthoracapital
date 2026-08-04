import { createHash, randomUUID } from 'node:crypto'
import type { DepositStatus, Prisma } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { notificationService } from '../notification.service.js'
import { storage } from '../storage/index.js'
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js'
import { d, moneyDisplay, moneyString } from '../../utils/money.js'
import { mapDeposit, mapPaymentMethod } from './finance.mappers.js'
import { ledgerService } from './ledger.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function depositRef(): string {
  return `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

async function requireActiveInvestor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, kycStatus: true },
  })
  if (!user) throw notFound('User not found.')
  if (user.status !== 'ACTIVE') throw forbidden('Account is not active.')
  if (user.kycStatus !== 'APPROVED') throw forbidden('KYC approval is required for deposits.')
  return user
}

export const depositService = {
  async listMethods() {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    })
    return methods.map(mapPaymentMethod)
  },

  async list(
    userId: string,
    query: { status?: DepositStatus; cursor?: string; limit?: number },
  ) {
    await requireActiveInvestor(userId)
    const limit = Math.min(query.limit ?? 20, 100)
    const items = await prisma.deposit.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
      },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })
    return {
      items: items.map(mapDeposit),
      nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null,
    }
  },

  async get(userId: string, id: string) {
    const deposit = await prisma.deposit.findFirst({
      where: { id, userId },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    if (!deposit) throw notFound('Deposit not found.')
    return mapDeposit(deposit)
  },

  async create(
    userId: string,
    body: {
      amount: string
      methodId: string
      userReference?: string
      txHash?: string
      idempotencyKey: string
    },
    context: Ctx,
  ) {
    await requireActiveInvestor(userId)
    const existing = await prisma.deposit.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    if (existing) {
      if (existing.userId !== userId) throw conflict('Idempotency key conflict.')
      return mapDeposit(existing)
    }

    const amount = d(body.amount)
    if (!amount.isFinite() || amount.lte(0)) throw badRequest('Invalid deposit amount.')

    const method = await prisma.paymentMethod.findFirst({
      where: { id: body.methodId, isActive: true, deletedAt: null },
    })
    if (!method) throw badRequest('Payment method is unavailable.')
    if (amount.lt(d(method.minAmount))) {
      throw badRequest(`Minimum deposit is ${moneyDisplay(method.minAmount)}.`)
    }
    if (method.maxAmount && amount.gt(d(method.maxAmount))) {
      throw badRequest(`Maximum deposit is ${moneyDisplay(method.maxAmount)}.`)
    }

    if (body.txHash) {
      const dupHash = await prisma.deposit.findUnique({ where: { txHash: body.txHash } })
      if (dupHash) throw conflict('This transaction hash was already used.')
    }

    const fee = amount.mul(d(method.feePct)).div(100)
    const wallet = await ledgerService.getInvestmentWallet(userId)

    const deposit = await prisma.$transaction(async (tx) => {
      const created = await tx.deposit.create({
        data: {
          reference: depositRef(),
          userId,
          walletId: wallet.id,
          paymentMethodId: method.id,
          amount: moneyString(amount),
          fee: moneyString(fee),
          status: 'PENDING',
          userReference: body.userReference?.slice(0, 120) ?? null,
          txHash: body.txHash?.slice(0, 120) ?? null,
          idempotencyKey: body.idempotencyKey,
          expiresAt: new Date(Date.now() + 7 * 24 * 3_600_000),
        },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })

      await ledgerService.adjustPending(tx, wallet.id, amount)
      await tx.approvalQueue.create({
        data: {
          entityType: 'DEPOSIT',
          entityId: created.id,
          depositId: created.id,
          status: 'PENDING',
          requiredRole: 'FINANCE',
          priority: 100,
        },
      })
      await tx.transactionHistory.create({
        data: {
          userId,
          event: 'DEPOSIT_SUBMITTED',
          status: 'PENDING',
          amount: moneyString(amount),
          currency: 'USD',
          message: `Deposit ${created.reference} submitted`,
        },
      })
      return created
    })

    await activityService.record({
      userId,
      actorId: userId,
      kind: 'DEPOSIT_SUBMITTED',
      title: 'Deposit submitted',
      description: deposit.reference,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'deposit.create',
      module: 'finance',
      newValue: { id: deposit.id, amount: moneyDisplay(amount) },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await notificationService.notify({
      userId,
      kind: 'FINANCE',
      title: 'Deposit submitted',
      body: `Your deposit ${deposit.reference} is pending review.`,
      metadata: { type: 'DEPOSIT_SUBMITTED', depositId: deposit.id },
    })

    return mapDeposit(deposit)
  },

  async uploadProof(
    userId: string,
    depositId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    context: Ctx,
  ) {
    const allowed = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'])
    if (!allowed.has(file.mimetype)) throw badRequest('Unsupported proof file type.')
    if (file.size > 5 * 1024 * 1024) throw badRequest('Proof file exceeds 5MB.')

    const deposit = await prisma.deposit.findFirst({ where: { id: depositId, userId } })
    if (!deposit) throw notFound('Deposit not found.')
    if (!['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
      throw forbidden('Proof cannot be uploaded for this deposit status.')
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex')
    const dup = await prisma.deposit.findFirst({
      where: { proofChecksum: checksum, NOT: { id: deposit.id } },
    })
    if (dup) throw conflict('Duplicate payment proof detected.')

    const stored = await storage.put({
      category: 'deposits',
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype,
    })

    const updated = await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        proofKey: stored.key,
        proofChecksum: checksum,
        status: deposit.status === 'PENDING' ? 'UNDER_REVIEW' : deposit.status,
      },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })

    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'deposit.proof_upload',
      module: 'finance',
      newValue: { depositId, proofKey: stored.key },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapDeposit(updated)
  },

  async cancel(userId: string, depositId: string, context: Ctx) {
    const deposit = await prisma.deposit.findFirst({ where: { id: depositId, userId } })
    if (!deposit) throw notFound('Deposit not found.')
    if (!['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
      throw forbidden('Only pending deposits can be cancelled.')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.deposit.update({
        where: { id: deposit.id },
        data: { status: 'CANCELLED' },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })
      await ledgerService.adjustPending(tx, deposit.walletId, d(deposit.amount).neg())
      await tx.approvalQueue.updateMany({
        where: { depositId: deposit.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        data: { status: 'CANCELLED', resolvedAt: new Date() },
      })
      return row
    })

    await activityService.record({
      userId,
      actorId: userId,
      kind: 'DEPOSIT_CANCELLED',
      title: 'Deposit cancelled',
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'deposit.cancel',
      module: 'finance',
      oldValue: { status: deposit.status },
      newValue: { status: 'CANCELLED' },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapDeposit(updated)
  },

  async adminList(query: {
    q?: string
    status?: DepositStatus
    paymentMethodId?: string
    reviewerId?: string
    from?: Date
    to?: Date
    minAmount?: string
    maxAmount?: string
    page: number
    limit: number
    cursor?: string
  }) {
    const where: Prisma.DepositWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethodId ? { paymentMethodId: query.paymentMethodId } : {}),
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
              { txHash: { contains: query.q } },
              { user: { email: { contains: query.q, mode: 'insensitive' } } },
              { user: { firstName: { contains: query.q, mode: 'insensitive' } } },
              { user: { lastName: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const skip = (query.page - 1) * query.limit
    const [items, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: {
          paymentMethod: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.cursor ? undefined : skip,
        take: query.limit,
        ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
      }),
      prisma.deposit.count({ where }),
    ])

    return {
      items: items.map((row) => ({
        ...mapDeposit(row),
        user: row.user,
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
    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: {
        paymentMethod: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true } },
        reviews: { orderBy: { createdAt: 'desc' } },
        queue: true,
      },
    })
    if (!deposit) throw notFound('Deposit not found.')
    return {
      ...mapDeposit(deposit),
      user: deposit.user,
      internalNotes: deposit.internalNotes,
      txHash: deposit.txHash,
      reviews: deposit.reviews,
      queue: deposit.queue,
      paymentMethod: mapPaymentMethod(deposit.paymentMethod),
    }
  },

  async review(
    actorId: string,
    depositId: string,
    body: {
      decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION' | 'FORCE_COMPLETE' | 'FORCE_CANCEL'
      reason?: string
      creditedAmount?: string
      internalNotes?: string
    },
    context: Ctx,
  ) {
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    if (!deposit) throw notFound('Deposit not found.')

    if (body.decision === 'APPROVE' || body.decision === 'FORCE_COMPLETE') {
      if (!['PENDING', 'UNDER_REVIEW'].includes(deposit.status) && body.decision === 'APPROVE') {
        throw badRequest('Deposit cannot be approved from the current status.')
      }
      const credit = d(body.creditedAmount ?? deposit.amount)
      if (credit.lte(0)) throw badRequest('Credited amount must be positive.')

      const updated = await prisma.$transaction(async (tx) => {
        const locked = await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: 'APPROVED',
            creditedAmount: moneyString(credit),
            reviewedById: actorId,
            reviewedAt: new Date(),
            internalNotes: body.internalNotes ?? deposit.internalNotes,
            rejectionReason: null,
          },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        })

        const txn = await ledgerService.creditAvailable(tx, {
          userId: deposit.userId,
          walletId: deposit.walletId,
          amount: credit,
          entryType: 'DEPOSIT_APPROVED',
          transactionType: 'DEPOSIT',
          description: `Deposit ${deposit.reference} approved`,
          referenceType: 'DEPOSIT',
          referenceId: deposit.id,
          createdById: actorId,
          idempotencyKey: `deposit:${deposit.id}:approve`,
          bumpDeposited: true,
          bumpInvested: true,
        })

        await tx.deposit.update({
          where: { id: deposit.id },
          data: { transactionId: txn.id },
        })
        await ledgerService.adjustPending(tx, deposit.walletId, d(deposit.amount).neg())
        await tx.approvalQueue.updateMany({
          where: { depositId: deposit.id },
          data: { status: 'APPROVED', resolvedAt: new Date(), assigneeId: actorId },
        })
        await tx.financeReview.create({
          data: {
            depositId: deposit.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_COMPLETE' ? 'FORCE_COMPLETE' : 'APPROVE',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        return locked
      })

      await activityService.record({
        userId: deposit.userId,
        actorId,
        kind: 'DEPOSIT_APPROVED',
        title: 'Deposit approved',
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await auditService.record({
        actorId,
        targetUserId: deposit.userId,
        action: 'deposit.approve',
        module: 'finance',
        oldValue: { status: deposit.status },
        newValue: { status: 'APPROVED', creditedAmount: moneyDisplay(credit) },
        reason: body.reason,
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await notificationService.notify({
        userId: deposit.userId,
        kind: 'FINANCE',
        title: 'Deposit approved',
        body: `Deposit ${deposit.reference} was approved for ${moneyDisplay(credit)}.`,
        metadata: { type: 'DEPOSIT_APPROVED', depositId: deposit.id },
      })
      return mapDeposit(updated)
    }

    if (body.decision === 'REJECT' || body.decision === 'FORCE_CANCEL') {
      if (!body.reason && body.decision === 'REJECT') {
        throw badRequest('A rejection reason is required.')
      }
      const nextStatus = body.decision === 'FORCE_CANCEL' ? 'CANCELLED' : 'REJECTED'
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: nextStatus,
            rejectionReason: body.reason ?? null,
            reviewedById: actorId,
            reviewedAt: new Date(),
            internalNotes: body.internalNotes ?? deposit.internalNotes,
          },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        })
        if (['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
          await ledgerService.adjustPending(tx, deposit.walletId, d(deposit.amount).neg())
        }
        await tx.approvalQueue.updateMany({
          where: { depositId: deposit.id },
          data: {
            status: body.decision === 'FORCE_CANCEL' ? 'CANCELLED' : 'REJECTED',
            resolvedAt: new Date(),
            assigneeId: actorId,
          },
        })
        await tx.financeReview.create({
          data: {
            depositId: deposit.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_CANCEL' ? 'FORCE_CANCEL' : 'REJECT',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        return row
      })

      await activityService.record({
        userId: deposit.userId,
        actorId,
        kind: 'DEPOSIT_REJECTED',
        title: nextStatus === 'CANCELLED' ? 'Deposit cancelled' : 'Deposit rejected',
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await auditService.record({
        actorId,
        targetUserId: deposit.userId,
        action: `deposit.${body.decision.toLowerCase()}`,
        module: 'finance',
        oldValue: { status: deposit.status },
        newValue: { status: nextStatus },
        reason: body.reason,
        ip: context.ip,
        userAgent: context.userAgent,
      })
      await notificationService.notify({
        userId: deposit.userId,
        kind: 'FINANCE',
        title: nextStatus === 'CANCELLED' ? 'Deposit cancelled' : 'Deposit rejected',
        body: body.reason ?? `Deposit ${deposit.reference} was ${nextStatus.toLowerCase()}.`,
        metadata: { type: 'DEPOSIT_REJECTED', depositId: deposit.id },
      })
      return mapDeposit(updated)
    }

    if (body.decision === 'REQUEST_INFORMATION') {
      if (!body.reason) throw badRequest('A message is required.')
      const updated = await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: 'UNDER_REVIEW',
          internalNotes: body.internalNotes ?? deposit.internalNotes,
        },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })
      await prisma.financeReview.create({
        data: {
          depositId: deposit.id,
          reviewerId: actorId,
          decision: 'REQUEST_INFORMATION',
          reason: body.reason,
          internalNotes: body.internalNotes ?? null,
        },
      })
      await notificationService.notify({
        userId: deposit.userId,
        kind: 'FINANCE',
        title: 'More information needed',
        body: body.reason,
        metadata: { type: 'DEPOSIT_INFO_REQUESTED', depositId: deposit.id },
      })
      await auditService.record({
        actorId,
        targetUserId: deposit.userId,
        action: 'deposit.request_information',
        module: 'finance',
        reason: body.reason,
        ip: context.ip,
        userAgent: context.userAgent,
      })
      return mapDeposit(updated)
    }

    throw badRequest('Unsupported decision.')
  },
}
