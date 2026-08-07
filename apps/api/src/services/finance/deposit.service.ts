import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'
import type { DepositStatus, Prisma } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { env } from '../../config/env.js'
import { transactionalMailer } from '../../emails/transactional.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { notificationService } from '../notification.service.js'
import { filesService } from '../files.service.js'
import { storage } from '../storage/index.js'
import { assertUploadMagicBytes } from '../../utils/upload-magic.js'
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { d, moneyDisplay, moneyString } from '../../utils/money.js'
import { DEFAULT_USD_INR_RATE, inrStorage, usdToInr } from '../../utils/fx.js'
import { settingsService } from '../settings.service.js'
import { buildDepositProofImageUrl, mapDeposit } from './finance.mappers.js'
import { mapPaymentMethodDetailed } from './payment-method.mapper.js'
import { ledgerService } from './ledger.service.js'
import { paymentMethodService } from './payment-method.service.js'

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
    return paymentMethodService.listEnabledForInvestor()
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
      amountInr?: string
      methodId: string
      userReference?: string
      txHash?: string
      notes?: string
      submissionDetails?: Record<string, string>
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

    const platform = await settingsService.getOrInitPlatformSettings()
    const rate = d(platform.usdInrRate ?? DEFAULT_USD_INR_RATE)
    // Always derive INR server-side — never trust client amountInr (forgery / rate tampering).
    const amountInr = usdToInr(amount, rate)
    if (!amountInr.isFinite() || amountInr.lte(0)) throw badRequest('Invalid INR amount.')

    const fee = amount.mul(d(method.feePct)).div(100)
    const wallet = await ledgerService.getInvestmentWallet(userId)

    let deposit
    try {
      deposit = await prisma.$transaction(async (tx) => {
        const submissionDetails = {
          ...(body.submissionDetails ?? {}),
          clientIp: context.ip ?? '',
          userAgent: context.userAgent ?? '',
          submittedAt: new Date().toISOString(),
          usdInrRate: rate.toFixed(8),
          depositUsd: moneyDisplay(amount),
          depositInr: amountInr.toFixed(0),
        }
        const created = await tx.deposit.create({
          data: {
            reference: depositRef(),
            userId,
            walletId: wallet.id,
            paymentMethodId: method.id,
            amount: moneyString(amount),
            amountInr: inrStorage(amountInr),
            fee: moneyString(fee),
            status: 'PENDING',
            userReference: body.userReference?.slice(0, 120) ?? null,
            txHash: body.txHash?.slice(0, 120) ?? null,
            notes: body.notes?.slice(0, 2000) ?? null,
            submissionDetails,
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
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        const again = await prisma.deposit.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        })
        if (again && again.userId === userId) return mapDeposit(again)
        throw conflict('Idempotency key conflict.')
      }
      throw err
    }

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
    await transactionalMailer.depositSubmitted(userId, {
      reference: deposit.reference,
      amount: moneyDisplay(amount),
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
    assertUploadMagicBytes(file.buffer, file.mimetype)

    const deposit = await prisma.deposit.findFirst({ where: { id: depositId, userId } })
    if (!deposit) throw notFound('Deposit not found.')
    if (!['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
      throw forbidden('Proof cannot be uploaded for this deposit status.')
    }

    logger.info(
      {
        depositId,
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        bytes: file.size,
      },
      'Deposit proof upload received',
    )

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

    const absolutePath = (() => {
      try {
        return storage.getAbsolutePath(stored.key)
      } catch {
        return null
      }
    })()
    const exists = await storage.exists(stored.key)
    if (!exists) {
      logger.error(
        { depositId, storageKey: stored.key, absolutePath, uploadRoot: env.UPLOAD_ROOT },
        'Deposit proof missing on disk after put',
      )
      throw badRequest('Proof upload failed — file was not stored. Please try again.')
    }

    const proofImageUrl = buildDepositProofImageUrl(deposit.id)
    const proofUploadedAt = new Date()

    logger.info(
      {
        depositId,
        storageKey: stored.key,
        absolutePath,
        proofImageUrl,
        uploadRoot: env.UPLOAD_ROOT,
      },
      'Deposit proof stored — saving database URL',
    )

    const updated = await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        proofKey: stored.key,
        proofImageUrl,
        proofChecksum: checksum,
        proofUploadedAt,
        status: deposit.status === 'PENDING' ? 'UNDER_REVIEW' : deposit.status,
      },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })

    const mapped = mapDeposit(updated)
    logger.info(
      {
        depositId,
        proofStorageKey: mapped.proofStorageKey,
        proofImageUrl: mapped.proofImageUrl,
        returnedApiUrl: mapped.proofImageUrl,
      },
      'Deposit proof saved — returning API URL',
    )

    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'deposit.proof_upload',
      module: 'finance',
      newValue: {
        depositId,
        proofKey: stored.key,
        proofImageUrl,
        proofUploadedAt: proofUploadedAt.toISOString(),
      },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapped
  },

  /**
   * Stream payment proof for the deposit owner or an authenticated staff operator.
   */
  async resolveProofFile(actor: {
    id: string
    isStaff: boolean
    depositId: string
  }) {
    const deposit = await prisma.deposit.findUnique({
      where: { id: actor.depositId },
      select: {
        id: true,
        userId: true,
        proofKey: true,
        proofImageUrl: true,
      },
    })
    if (!deposit) throw notFound('Deposit not found.')
    if (deposit.userId !== actor.id && !actor.isStaff) {
      throw forbidden('Not allowed to view this payment proof.')
    }
    if (!deposit.proofKey || !deposit.proofKey.trim()) {
      throw notFound('No payment proof uploaded.')
    }

    const exists = await storage.exists(deposit.proofKey)
    if (!exists) {
      logger.error(
        {
          depositId: deposit.id,
          storageKey: deposit.proofKey,
          uploadRoot: env.UPLOAD_ROOT,
        },
        'Deposit proof file missing on storage',
      )
      throw notFound('Proof file missing on storage. Ask the investor to re-upload.')
    }

    const ext = path.extname(deposit.proofKey).toLowerCase()
    const mimeType =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.pdf'
              ? 'application/pdf'
              : 'application/octet-stream'

    return {
      storageKey: deposit.proofKey,
      mimeType,
      originalName: path.basename(deposit.proofKey),
      proofImageUrl: deposit.proofImageUrl || buildDepositProofImageUrl(deposit.id),
    }
  },

  async cancel(userId: string, depositId: string, context: Ctx) {
    const deposit = await prisma.deposit.findFirst({ where: { id: depositId, userId } })
    if (!deposit) throw notFound('Deposit not found.')
    if (!['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
      throw forbidden('Only pending deposits can be cancelled.')
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM deposits WHERE id = ${deposit.id}::uuid FOR UPDATE`
      const claimed = await tx.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { status: 'CANCELLED' },
      })
      if (claimed.count !== 1) {
        throw conflict('Deposit status changed concurrently; cancel aborted.')
      }
      await ledgerService.adjustPending(tx, deposit.walletId, d(deposit.amount).neg())
      await tx.approvalQueue.updateMany({
        where: { depositId: deposit.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        data: { status: 'CANCELLED', resolvedAt: new Date() },
      })
      return tx.deposit.findUniqueOrThrow({
        where: { id: deposit.id },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })
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
      items: items.map((row) => {
        const mapped = mapDeposit(row)
        const proofImageUrl = mapped.hasProof
          ? `${env.API_URL.replace(/\/$/, '')}/api/v1/admin/deposits/${row.id}/proof`
          : null
        return {
          ...mapped,
          proofImageUrl,
          proofUrl: proofImageUrl,
          user: row.user,
        }
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: skip + items.length < total,
      },
    }
  },

  async adminGet(id: string) {
    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: {
        paymentMethod: {
          include: {
            upiDetails: true,
            bankDetails: true,
            walletAddresses: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            kycStatus: true,
          },
        },
        reviews: { orderBy: { createdAt: 'desc' } },
        queue: true,
      },
    })
    if (!deposit) throw notFound('Deposit not found.')
    const adminProofUrl = `${env.API_URL.replace(/\/$/, '')}/api/v1/admin/deposits/${deposit.id}/proof`
    let signedFallback: string | null = null
    if (deposit.proofKey && deposit.proofKey.trim()) {
      try {
        signedFallback = filesService.buildDownloadUrl(deposit.proofKey, 60 * 60)
      } catch (err) {
        logger.warn({ err, depositId: deposit.id, proofKey: deposit.proofKey }, 'Signed proof URL failed')
        signedFallback = null
      }
      logger.info(
        {
          depositId: deposit.id,
          proofStorageKey: deposit.proofKey,
          proofImageUrl: adminProofUrl,
          signedFallback,
          returnedApiUrl: adminProofUrl,
        },
        'Admin deposit detail — returning proof URLs',
      )
    }
    const details =
      deposit.submissionDetails && typeof deposit.submissionDetails === 'object'
        ? (deposit.submissionDetails as Record<string, unknown>)
        : {}
    const mapped = mapDeposit(deposit)
    const proofImageUrl = mapped.hasProof ? adminProofUrl : null
    return {
      ...mapped,
      user: {
        ...deposit.user,
        phone: (deposit.user as { phone?: string | null }).phone ?? null,
      },
      internalNotes: deposit.internalNotes,
      notes: deposit.notes,
      submissionDetails: details,
      txHash: deposit.txHash,
      userReference: deposit.userReference,
      proofUrl: proofImageUrl,
      proofImageUrl,
      proofStorageKey: mapped.proofStorageKey,
      proofKey: deposit.proofKey,
      signedProofUrl: signedFallback,
      hasProof: Boolean(deposit.proofKey),
      clientIp: typeof details.clientIp === 'string' ? details.clientIp : null,
      userAgent: typeof details.userAgent === 'string' ? details.userAgent : null,
      reviews: deposit.reviews,
      queue: deposit.queue,
      paymentMethod: mapPaymentMethodDetailed(deposit.paymentMethod),
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
      // FORCE_COMPLETE uses the same status gate as APPROVE — never credit cancelled/rejected rows.
      const creditRequested = d(body.creditedAmount ?? deposit.amount)
      if (creditRequested.lte(0)) throw badRequest('Credited amount must be positive.')

      const updated = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM deposits WHERE id = ${deposit.id}::uuid FOR UPDATE`
        const current = await tx.deposit.findUniqueOrThrow({
          where: { id: deposit.id },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        })

        if (current.status === 'APPROVED') {
          return current
        }
        if (!['PENDING', 'UNDER_REVIEW'].includes(current.status)) {
          throw badRequest('Deposit cannot be approved from the current status.')
        }

        // Never over-credit above the requested deposit amount.
        const credit = creditRequested.gt(d(current.amount)) ? d(current.amount) : creditRequested

        const claimed = await tx.deposit.updateMany({
          where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
          data: {
            status: 'APPROVED',
            creditedAmount: moneyString(credit),
            reviewedById: actorId,
            reviewedAt: new Date(),
            internalNotes: body.internalNotes ?? current.internalNotes,
            rejectionReason: null,
          },
        })
        if (claimed.count !== 1) {
          throw conflict('Deposit status changed concurrently; approve aborted.')
        }

        const txn = await ledgerService.creditAvailable(tx, {
          userId: current.userId,
          walletId: current.walletId,
          amount: credit,
          entryType: 'DEPOSIT_APPROVED',
          transactionType: 'DEPOSIT',
          description: `Deposit ${current.reference} approved`,
          referenceType: 'DEPOSIT',
          referenceId: current.id,
          createdById: actorId,
          idempotencyKey: `deposit:${current.id}:approve`,
          bumpDeposited: true,
          bumpInvested: true,
        })

        await tx.deposit.update({
          where: { id: current.id },
          data: { transactionId: txn.id },
        })
        await ledgerService.adjustPending(tx, current.walletId, d(current.amount).neg())
        await tx.approvalQueue.updateMany({
          where: { depositId: current.id },
          data: { status: 'APPROVED', resolvedAt: new Date(), assigneeId: actorId },
        })
        await tx.financeReview.create({
          data: {
            depositId: current.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_COMPLETE' ? 'FORCE_COMPLETE' : 'APPROVE',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        return tx.deposit.findUniqueOrThrow({
          where: { id: current.id },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        })
      })

      const credit = d(updated.creditedAmount ?? updated.amount)

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
      await transactionalMailer.depositApproved(deposit.userId, {
        reference: deposit.reference,
        amount: moneyDisplay(credit),
      })
      return mapDeposit(updated)
    }

    if (body.decision === 'REJECT' || body.decision === 'FORCE_CANCEL') {
      if (!body.reason && body.decision === 'REJECT') {
        throw badRequest('A rejection reason is required.')
      }
      const nextStatus = body.decision === 'FORCE_CANCEL' ? 'CANCELLED' : 'REJECTED'
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM deposits WHERE id = ${deposit.id}::uuid FOR UPDATE`
        const current = await tx.deposit.findUniqueOrThrow({
          where: { id: deposit.id },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        })

        if (current.status === nextStatus) {
          return current
        }

        // H1: FORCE_CANCEL after APPROVE must reverse the ledger credit.
        if (current.status === 'APPROVED') {
          if (body.decision !== 'FORCE_CANCEL') {
            throw badRequest('Approved deposits cannot be rejected; use FORCE_CANCEL to reverse.')
          }
          const credited = d(current.creditedAmount ?? current.amount)
          await ledgerService.reverseDepositCredit(tx, {
            userId: current.userId,
            walletId: current.walletId,
            amount: credited,
            description: `Deposit ${current.reference} force-cancelled`,
            referenceType: 'DEPOSIT',
            referenceId: current.id,
            createdById: actorId,
            idempotencyKey: `deposit:${current.id}:force_cancel`,
          })
          await tx.deposit.update({
            where: { id: current.id },
            data: {
              status: 'CANCELLED',
              rejectionReason: body.reason ?? 'FORCE_CANCEL after approval',
              reviewedById: actorId,
              reviewedAt: new Date(),
              internalNotes: body.internalNotes ?? current.internalNotes,
            },
          })
        } else if (['PENDING', 'UNDER_REVIEW'].includes(current.status)) {
          const claimed = await tx.deposit.updateMany({
            where: { id: current.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
            data: {
              status: nextStatus,
              rejectionReason: body.reason ?? null,
              reviewedById: actorId,
              reviewedAt: new Date(),
              internalNotes: body.internalNotes ?? current.internalNotes,
            },
          })
          if (claimed.count !== 1) {
            throw conflict('Deposit status changed concurrently; reject aborted.')
          }
          await ledgerService.adjustPending(tx, current.walletId, d(current.amount).neg())
        } else {
          throw badRequest('Deposit cannot be rejected from the current status.')
        }

        await tx.approvalQueue.updateMany({
          where: { depositId: current.id },
          data: {
            status: body.decision === 'FORCE_CANCEL' ? 'CANCELLED' : 'REJECTED',
            resolvedAt: new Date(),
            assigneeId: actorId,
          },
        })
        await tx.financeReview.create({
          data: {
            depositId: current.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_CANCEL' ? 'FORCE_CANCEL' : 'REJECT',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        return tx.deposit.findUniqueOrThrow({
          where: { id: current.id },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        })
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
      if (nextStatus === 'REJECTED') {
        await transactionalMailer.depositRejected(deposit.userId, {
          reference: deposit.reference,
          amount: moneyDisplay(deposit.amount),
          reason: body.reason ?? 'Deposit rejected',
        })
      }
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

  /**
   * Provider webhook confirmation — credits ledger identically to admin APPROVE.
   * Idempotent via `deposit:{id}:approve` ledger key.
   */
  async confirmFromProvider(
    depositId: string,
    input: {
      amount?: string
      eventId: string
      txHash?: string
      context: Ctx
    },
  ) {
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    if (!deposit) throw notFound('Deposit not found.')

    const creditRequested = d(input.amount ?? deposit.amount)
    if (creditRequested.lte(0)) throw badRequest('Credited amount must be positive.')

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM deposits WHERE id = ${deposit.id}::uuid FOR UPDATE`
      const current = await tx.deposit.findUniqueOrThrow({
        where: { id: deposit.id },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })

      if (current.status === 'APPROVED') {
        return current
      }
      if (!['PENDING', 'UNDER_REVIEW'].includes(current.status)) {
        throw badRequest('Deposit cannot be provider-confirmed from the current status.')
      }

      const credit = creditRequested.gt(d(current.amount)) ? d(current.amount) : creditRequested

      const claimed = await tx.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: {
          status: 'APPROVED',
          creditedAmount: moneyString(credit),
          reviewedAt: new Date(),
          txHash: input.txHash?.slice(0, 120) ?? current.txHash,
          internalNotes: `Provider confirmed ${input.eventId}`,
          rejectionReason: null,
        },
      })
      if (claimed.count !== 1) {
        throw conflict('Deposit status changed concurrently; provider confirm aborted.')
      }

      const txn = await ledgerService.creditAvailable(tx, {
        userId: current.userId,
        walletId: current.walletId,
        amount: credit,
        entryType: 'DEPOSIT_APPROVED',
        transactionType: 'DEPOSIT',
        description: `Deposit ${current.reference} confirmed by provider`,
        referenceType: 'DEPOSIT',
        referenceId: current.id,
        createdById: null,
        idempotencyKey: `deposit:${current.id}:approve`,
        bumpDeposited: true,
        bumpInvested: true,
      })

      await tx.deposit.update({
        where: { id: current.id },
        data: { transactionId: txn.id },
      })
      await ledgerService.adjustPending(tx, current.walletId, d(current.amount).neg())
      await tx.approvalQueue.updateMany({
        where: { depositId: current.id },
        data: { status: 'APPROVED', resolvedAt: new Date() },
      })
      await tx.financeReview.create({
        data: {
          depositId: current.id,
          decision: 'PROVIDER_CONFIRM',
          reason: `Webhook ${input.eventId}`,
          metadata: { eventId: input.eventId, credited: moneyString(credit) },
        },
      })
      await tx.transactionHistory.create({
        data: {
          userId: current.userId,
          transactionId: txn.id,
          event: 'DEPOSIT_PROVIDER_CONFIRMED',
          status: 'APPROVED',
          amount: moneyString(credit),
          currency: 'USD',
          message: `Deposit ${current.reference} confirmed by payment provider`,
        },
      })
      return tx.deposit.findUniqueOrThrow({
        where: { id: current.id },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })
    })

    const credit = d(updated.creditedAmount ?? updated.amount)
    await activityService.record({
      userId: deposit.userId,
      kind: 'DEPOSIT_APPROVED',
      title: 'Deposit confirmed by provider',
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await auditService.record({
      actorId: null,
      targetUserId: deposit.userId,
      action: 'deposit.provider_confirm',
      module: 'finance',
      oldValue: { status: deposit.status },
      newValue: { status: 'APPROVED', creditedAmount: moneyDisplay(credit), eventId: input.eventId },
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await notificationService.notify({
      userId: deposit.userId,
      kind: 'FINANCE',
      title: 'Deposit confirmed',
      body: `Deposit ${deposit.reference} was confirmed for ${moneyDisplay(credit)}.`,
      metadata: { type: 'DEPOSIT_APPROVED', depositId: deposit.id },
    })
    await transactionalMailer.depositApproved(deposit.userId, {
      reference: deposit.reference,
      amount: moneyDisplay(credit),
    })

    return moneyDisplay(credit)
  },

  async markFailedFromProvider(
    depositId: string,
    input: { eventId: string; reason?: string; context: Ctx },
  ) {
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    if (!deposit) throw notFound('Deposit not found.')
    if (deposit.status === 'REJECTED' || deposit.status === 'CANCELLED') {
      return mapDeposit(deposit)
    }
    if (deposit.status === 'APPROVED') {
      throw badRequest('Approved deposits cannot be marked failed by provider; use FORCE_CANCEL.')
    }
    if (!['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
      throw badRequest('Deposit cannot be marked failed from the current status.')
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM deposits WHERE id = ${deposit.id}::uuid FOR UPDATE`
      const current = await tx.deposit.findUniqueOrThrow({
        where: { id: deposit.id },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })
      if (!['PENDING', 'UNDER_REVIEW'].includes(current.status)) {
        return current
      }
      await tx.deposit.update({
        where: { id: current.id },
        data: {
          status: 'REJECTED',
          rejectionReason: input.reason ?? 'Provider reported payment failed',
          reviewedAt: new Date(),
          internalNotes: `webhook:${input.eventId}`,
        },
      })
      await ledgerService.adjustPending(tx, current.walletId, d(current.amount).neg())
      await tx.approvalQueue.updateMany({
        where: { depositId: current.id },
        data: { status: 'REJECTED', resolvedAt: new Date() },
      })
      await tx.financeReview.create({
        data: {
          depositId: current.id,
          decision: 'REJECT',
          reason: input.reason ?? 'Provider reported payment failed',
          metadata: { eventId: input.eventId, source: 'webhook' },
        },
      })
      return tx.deposit.findUniqueOrThrow({
        where: { id: current.id },
        include: { paymentMethod: { select: { id: true, name: true, type: true } } },
      })
    })

    await activityService.record({
      userId: deposit.userId,
      kind: 'DEPOSIT_REJECTED',
      title: 'Deposit failed at provider',
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await auditService.record({
      actorId: null,
      targetUserId: deposit.userId,
      action: 'deposit.provider_failed',
      module: 'finance',
      reason: input.reason,
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await notificationService.notify({
      userId: deposit.userId,
      kind: 'FINANCE',
      title: 'Deposit failed',
      body: input.reason ?? `Deposit ${deposit.reference} failed at the payment provider.`,
      metadata: { type: 'DEPOSIT_REJECTED', depositId: deposit.id },
    })
    return mapDeposit(updated)
  },
}
