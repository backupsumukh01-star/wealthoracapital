import { randomUUID } from 'node:crypto'
import type { PaymentMethodType, Prisma, WithdrawalStatus } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { transactionalMailer } from '../../emails/transactional.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { notificationService } from '../notification.service.js'
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js'
import { d, moneyDisplay, moneyString } from '../../utils/money.js'
import { DEFAULT_USD_INR_RATE, inrStorage, usdToInr } from '../../utils/fx.js'
import { settingsService } from '../settings.service.js'
import { mapPayoutMethod, mapWithdrawal } from './finance.mappers.js'
import { ledgerService } from './ledger.service.js'
import {
  getLatestQualifyingDepositRail,
  getWithdrawalEligibility,
  payoutRailFromType,
} from './currency.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

const DEFAULT_MIN = d('20')
const DEFAULT_MAX = d('100000')
const DEFAULT_FEE_PCT = d('0')
const DAILY_LIMIT = d('50000')

function withdrawalRef(): string {
  return `WD-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function last4(value: string) {
  return value.replace(/\s+/g, '').slice(-4).padStart(4, '•')
}

function normalizePayoutDetails(type: PaymentMethodType, details: Record<string, string>) {
  if (type === 'BANK_TRANSFER') {
    const accountHolderName = details.accountHolderName?.trim()
    const bankName = details.bankName?.trim()
    const accountNumber = details.accountNumber?.trim()
    const ifscCode = details.ifscCode?.trim().toUpperCase()
    if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
      throw badRequest('Bank account name, bank name, account number and IFSC are required.')
    }
    return {
      details: { accountHolderName, bankName, accountNumber, ifscCode },
      maskedDetails: `${bankName} ••••${last4(accountNumber)}`,
    }
  }

  if (type === 'UPI') {
    const upiId = details.upiId?.trim()
    if (!upiId) throw badRequest('UPI ID is required.')
    return {
      details: { upiId },
      maskedDetails: `UPI ${upiId.replace(/^(.{2}).+(@.+)$/, '$1••••$2')}`,
    }
  }

  const coin = (details.coin?.trim() || type.replace(/_.+$/, '')).toUpperCase()
  const network = (details.network?.trim() || type.replace(/^USDT_/, '')).toUpperCase()
  const address = details.address?.trim()
  if (!address) throw badRequest('Wallet address is required.')
  return {
    details: { coin, network, address },
    maskedDetails: `${coin} ${network} ••••${last4(address)}`,
  }
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
    const eligibility = await getWithdrawalEligibility(userId)
    const latestRail = await getLatestQualifyingDepositRail(userId)
    return {
      min: moneyDisplay(DEFAULT_MIN),
      max: moneyDisplay(DEFAULT_MAX),
      dailyRemaining: moneyDisplay(DecimalMax(DAILY_LIMIT.minus(used), d(0))),
      feePct: moneyDisplay(DEFAULT_FEE_PCT),
      availableBalance: moneyDisplay(wallet.availableBalance),
      lockedBalance: moneyDisplay(wallet.lockedBalance),
      depositLockedAmount: eligibility.lockedAmount,
      eligibleAmount: eligibility.eligibleAmount,
      nextUnlockAt: eligibility.nextUnlockAt,
      requiredPayoutRail: latestRail?.rail ?? null,
    }
  },

  /** Issue email OTP — must succeed before create(). */
  async requestOtp(
    userId: string,
    body: { amount: string; payoutMethodId: string },
    _context: Ctx,
  ) {
    await requireActiveInvestor(userId)
    const amount = d(body.amount)
    if (!amount.isFinite() || amount.lte(0)) throw badRequest('Invalid withdrawal amount.')

    const payout = await prisma.payoutMethod.findFirst({
      where: { id: body.payoutMethodId, userId, deletedAt: null },
    })
    if (!payout) throw badRequest('Payout method not found.')

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, firstName: true },
    })

    // 60s cooldown between OTP sends
    const recent = await prisma.verificationToken.findFirst({
      where: { userId, type: 'EMAIL_CHANGE', createdAt: { gt: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      const payload = recent.payload as { otpKind?: string } | null
      if (payload?.otpKind === 'WITHDRAWAL_OTP') {
        throw badRequest('Please wait 60 seconds before requesting another code.')
      }
    }

    const details = (payout.details ?? {}) as Record<string, string>
    const { emailOtpService } = await import('../email-otp.service.js')
    return emailOtpService.issueWithdrawalOtp({
      userId,
      email: user.email,
      firstName: user.firstName,
      amount: moneyDisplay(amount),
      payoutMethodId: payout.id,
      wallet: details.address ?? details.upiId ?? details.accountNumber ?? payout.maskedDetails,
      network: details.network ?? payout.type,
    })
  },

  async listPayoutMethods(userId: string) {
    await requireActiveInvestor(userId)
    const methods = await prisma.payoutMethod.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return methods.map(mapPayoutMethod)
  },

  async createPayoutMethod(
    userId: string,
    body: {
      label: string
      type: PaymentMethodType
      details: Record<string, string>
      isDefault?: boolean
    },
    context: Ctx,
  ) {
    await requireActiveInvestor(userId)
    const normalized = normalizePayoutDetails(body.type, body.details)
    const existingCount = await prisma.payoutMethod.count({ where: { userId, deletedAt: null } })
    const isDefault = body.isDefault ?? existingCount === 0

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.payoutMethod.updateMany({
          where: { userId, deletedAt: null },
          data: { isDefault: false },
        })
      }
      return tx.payoutMethod.create({
        data: {
          userId,
          label: body.label.trim(),
          type: body.type,
          details: normalized.details,
          maskedDetails: normalized.maskedDetails,
          isDefault,
          isVerified: false,
        },
      })
    })

    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'payout_method.create',
      module: 'finance',
      newValue: { id: created.id, type: created.type, label: created.label },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapPayoutMethod(created)
  },

  async updatePayoutMethod(
    userId: string,
    id: string,
    body: {
      label?: string
      details?: Record<string, string>
      isDefault?: boolean
    },
    context: Ctx,
  ) {
    await requireActiveInvestor(userId)
    const existing = await prisma.payoutMethod.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!existing) throw notFound('Payout method not found.')

    const nextLabel = body.label?.trim() ?? existing.label
    const normalized =
      body.details != null ? normalizePayoutDetails(existing.type, body.details) : null
    const makeDefault = body.isDefault === true

    const updated = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.payoutMethod.updateMany({
          where: { userId, deletedAt: null, id: { not: id } },
          data: { isDefault: false },
        })
      }
      return tx.payoutMethod.update({
        where: { id },
        data: {
          label: nextLabel,
          ...(normalized
            ? { details: normalized.details, maskedDetails: normalized.maskedDetails }
            : {}),
          ...(makeDefault ? { isDefault: true } : body.isDefault === false ? { isDefault: false } : {}),
        },
      })
    })

    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'payout_method.update',
      module: 'finance',
      newValue: { id: updated.id, type: updated.type, label: updated.label },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapPayoutMethod(updated)
  },

  async deletePayoutMethod(userId: string, id: string, context: Ctx) {
    await requireActiveInvestor(userId)
    const existing = await prisma.payoutMethod.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!existing) throw notFound('Payout method not found.')

    await prisma.$transaction(async (tx) => {
      await tx.payoutMethod.update({
        where: { id },
        data: { deletedAt: new Date(), isDefault: false },
      })
      if (existing.isDefault) {
        const next = await tx.payoutMethod.findFirst({
          where: { userId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        })
        if (next) {
          await tx.payoutMethod.update({
            where: { id: next.id },
            data: { isDefault: true },
          })
        }
      }
    })

    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'payout_method.delete',
      module: 'finance',
      newValue: { id: existing.id, type: existing.type, label: existing.label },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return { id }
  },

  async setDefaultPayoutMethod(userId: string, id: string, context: Ctx) {
    await requireActiveInvestor(userId)
    const existing = await prisma.payoutMethod.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!existing) throw notFound('Payout method not found.')

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payoutMethod.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      })
      return tx.payoutMethod.update({
        where: { id },
        data: { isDefault: true },
      })
    })

    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'payout_method.set_default',
      module: 'finance',
      newValue: { id: updated.id, type: updated.type, label: updated.label },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return mapPayoutMethod(updated)
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
    body: {
      amount: string
      amountInr?: string
      payoutMethodId: string
      otp: string
      idempotencyKey: string
    },
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

    const { emailOtpService } = await import('../email-otp.service.js')

    const amount = d(body.amount)
    if (!amount.isFinite() || amount.lte(0)) throw badRequest('Invalid withdrawal amount.')
    if (amount.lt(DEFAULT_MIN)) throw badRequest(`Minimum withdrawal is ${moneyDisplay(DEFAULT_MIN)}.`)
    if (amount.gt(DEFAULT_MAX)) throw badRequest(`Maximum withdrawal is ${moneyDisplay(DEFAULT_MAX)}.`)

    const payout = await prisma.payoutMethod.findFirst({
      where: { id: body.payoutMethodId, userId, deletedAt: null },
    })
    if (!payout) throw badRequest('Payout method not found.')

    // Rail rule foundation: latest approved deposit rail must match payout rail when known.
    const latestRail = await getLatestQualifyingDepositRail(userId)
    if (latestRail && (latestRail.rail === 'INR' || latestRail.rail === 'CRYPTO')) {
      const payoutRail = payoutRailFromType(payout.type)
      if (payoutRail !== latestRail.rail) {
        throw badRequest(
          latestRail.rail === 'CRYPTO'
            ? 'Your latest deposit was via crypto. Withdrawals must use a crypto payout method.'
            : 'Your latest deposit was via INR. Withdrawals must use an INR payout method.',
          {
            requiredRail: latestRail.rail,
            payoutRail,
          },
        )
      }
    }

    const eligibility = await getWithdrawalEligibility(userId)
    if (amount.gt(d(eligibility.eligibleAmount))) {
      throw badRequest('Some funds are still within the required 10-day holding period.', {
        availableAmount: eligibility.eligibleAmount,
        lockedAmount: eligibility.lockedAmount,
        nextUnlockAt: eligibility.nextUnlockAt,
        walletAvailable: eligibility.availableBalance,
      })
    }

    const platform = await settingsService.getOrInitPlatformSettings()
    const rate = d(platform.usdInrRate ?? DEFAULT_USD_INR_RATE)
    // Always derive INR server-side — never trust client amountInr (forgery / rate tampering).
    const amountInr = usdToInr(amount, rate)
    if (!amountInr.isFinite() || amountInr.lte(0)) throw badRequest('Invalid INR amount.')

    // Verify OTP only after amount/method validation so a bad request does not burn the code.
    await emailOtpService.verifyWithdrawalOtp(userId, body.otp, {
      amount: moneyDisplay(amount),
      payoutMethodId: payout.id,
    })

    const fee = amount.mul(DEFAULT_FEE_PCT).div(100)
    const net = amount.minus(fee)

    let withdrawal
    try {
      withdrawal = await prisma.$transaction(async (tx) => {
        // Serialize withdraw creates per user so daily limit cannot be bypassed concurrently.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`withdraw:${userId}`}))`

        const wallet = await ledgerService.getInvestmentWallet(userId, tx)
        await tx.$executeRaw`SELECT 1 FROM wallets WHERE id = ${wallet.id}::uuid FOR UPDATE`

        const start = new Date()
        start.setUTCHours(0, 0, 0, 0)
        const withdrawnToday = await tx.withdrawal.aggregate({
          where: {
            userId,
            createdAt: { gte: start },
            status: { notIn: ['CANCELLED', 'REJECTED'] },
          },
          _sum: { amount: true },
        })
        const used = d(withdrawnToday._sum.amount ?? 0)
        const remaining = DecimalMax(DAILY_LIMIT.minus(used), d(0))
        if (amount.gt(remaining)) {
          throw badRequest('Daily withdrawal limit exceeded.')
        }

        const freshWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } })
        if (amount.gt(d(freshWallet.availableBalance))) {
          throw badRequest('Amount exceeds available balance or limits.')
        }

        // Re-check deposit lock inside the transaction so concurrent requests cannot bypass.
        const lockedEligibility = await getWithdrawalEligibility(userId, tx)
        if (amount.gt(d(lockedEligibility.eligibleAmount))) {
          throw badRequest('Some funds are still within the required 10-day holding period.', {
            availableAmount: lockedEligibility.eligibleAmount,
            lockedAmount: lockedEligibility.lockedAmount,
            nextUnlockAt: lockedEligibility.nextUnlockAt,
          })
        }

        const created = await tx.withdrawal.create({
          data: {
            reference: withdrawalRef(),
            userId,
            walletId: wallet.id,
            payoutMethodId: payout.id,
            amount: moneyString(amount),
            amountInr: inrStorage(amountInr),
            fee: moneyString(fee),
            netAmount: moneyString(net),
            status: 'PENDING',
            destinationLabel: payout.label,
            destinationSnapshot: {
              label: payout.label,
              type: payout.type,
              details: payout.details,
              maskedDetails: payout.maskedDetails,
              usdInrRate: rate.toFixed(8),
              withdrawUsd: moneyDisplay(amount),
              withdrawInr: amountInr.toFixed(0),
            },
            otpVerifiedAt: new Date(),
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
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        const again = await prisma.withdrawal.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
        })
        if (again && again.userId === userId) return mapWithdrawal(again)
        throw conflict('Idempotency key conflict.')
      }
      throw err
    }

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
    await transactionalMailer.withdrawalSubmitted(userId, {
      reference: withdrawal.reference,
      amount: moneyDisplay(amount),
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
      await tx.$executeRaw`SELECT 1 FROM withdrawals WHERE id = ${row.id}::uuid FOR UPDATE`
      const claimed = await tx.withdrawal.updateMany({
        where: { id: row.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { status: 'CANCELLED' },
      })
      if (claimed.count !== 1) {
        throw conflict('Withdrawal status changed concurrently; cancel aborted.')
      }
      await ledgerService.unlockFunds(tx, {
        userId,
        walletId: row.walletId,
        amount: d(row.amount),
        description: `Withdrawal ${row.reference} cancelled`,
        referenceType: 'WITHDRAWAL',
        referenceId: row.id,
        createdById: userId,
        idempotencyKey: `withdrawal:${row.id}:unlock`,
      })
      await tx.approvalQueue.updateMany({
        where: { withdrawalId: row.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        data: { status: 'CANCELLED', resolvedAt: new Date() },
      })
      return tx.withdrawal.findUniqueOrThrow({ where: { id: row.id } })
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
      // Admin "Pending" tab uses PENDING; create flow moves rows to UNDER_REVIEW.
      ...(query.status
        ? query.status === 'PENDING'
          ? { status: { in: ['PENDING', 'UNDER_REVIEW'] as WithdrawalStatus[] } }
          : { status: query.status }
        : {}),
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

    const userIds = [...new Set(items.map((row) => row.userId))]
    const wallets = userIds.length
      ? await prisma.wallet.findMany({
          where: { userId: { in: userIds }, kind: 'INVESTMENT' },
          select: { userId: true, availableBalance: true, balance: true },
        })
      : []
    const walletByUser = new Map(wallets.map((w) => [w.userId, w]))

    return {
      items: items.map((row) => {
        const wallet = walletByUser.get(row.userId)
        return {
          ...mapWithdrawal(row),
          user: row.user,
          payoutMethod: mapPayoutMethod(row.payoutMethod),
          availableBalance: moneyDisplay(wallet?.availableBalance ?? 0),
          walletBalance: moneyDisplay(wallet?.balance ?? 0),
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
    const wallet = await prisma.wallet.findUnique({
      where: { userId_kind: { userId: row.userId, kind: 'INVESTMENT' } },
      select: { availableBalance: true, balance: true },
    })
    return {
      ...mapWithdrawal(row),
      user: row.user,
      internalNotes: row.internalNotes,
      payoutMethod: mapPayoutMethod(row.payoutMethod),
      destinationSnapshot: row.destinationSnapshot,
      reviews: row.reviews,
      queue: row.queue,
      availableBalance: moneyDisplay(wallet?.availableBalance ?? 0),
      walletBalance: moneyDisplay(wallet?.balance ?? 0),
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
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM withdrawals WHERE id = ${row.id}::uuid FOR UPDATE`
        const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: row.id } })
        if (current.status === 'APPROVED') return current
        if (!['PENDING', 'UNDER_REVIEW'].includes(current.status)) {
          throw badRequest('Withdrawal cannot be approved from the current status.')
        }
        const claimed = await tx.withdrawal.updateMany({
          where: { id: current.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
          data: {
            status: 'APPROVED',
            reviewedById: actorId,
            reviewedAt: new Date(),
            internalNotes: body.internalNotes ?? current.internalNotes,
          },
        })
        if (claimed.count !== 1) {
          throw conflict('Withdrawal status changed concurrently; approve aborted.')
        }
        await tx.financeReview.create({
          data: {
            withdrawalId: current.id,
            reviewerId: actorId,
            decision: 'APPROVE',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        await tx.approvalQueue.updateMany({
          where: { withdrawalId: current.id },
          data: { status: 'IN_PROGRESS', assigneeId: actorId },
        })
        return tx.withdrawal.findUniqueOrThrow({ where: { id: current.id } })
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
      await transactionalMailer.withdrawalApproved(row.userId, {
        reference: row.reference,
        amount: moneyDisplay(row.amount),
      })
      return mapWithdrawal(updated)
    }

    if (body.decision === 'PAID' || body.decision === 'FORCE_COMPLETE') {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM withdrawals WHERE id = ${row.id}::uuid FOR UPDATE`
        const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: row.id } })

        if (current.status === 'PAID' || current.status === 'COMPLETED') {
          return current
        }
        if (body.decision === 'PAID') {
          if (!['APPROVED', 'PROCESSING'].includes(current.status)) {
            throw badRequest('Mark as paid only after approval (APPROVED or PROCESSING).')
          }
        } else if (!['APPROVED', 'PROCESSING', 'UNDER_REVIEW', 'PENDING'].includes(current.status)) {
          throw badRequest('Withdrawal cannot be force-completed from the current status.')
        }

        const allowedStatuses =
          body.decision === 'PAID'
            ? (['APPROVED', 'PROCESSING'] as const)
            : (['APPROVED', 'PROCESSING', 'UNDER_REVIEW', 'PENDING'] as const)

        const claimed = await tx.withdrawal.updateMany({
          where: {
            id: current.id,
            status: { in: [...allowedStatuses] },
          },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            reviewedById: actorId,
            reviewedAt: current.reviewedAt ?? new Date(),
            transactionRef: body.transactionRef ?? current.transactionRef,
            internalNotes: body.internalNotes ?? current.internalNotes,
          },
        })
        if (claimed.count !== 1) {
          throw conflict('Withdrawal status changed concurrently; complete aborted.')
        }

        const already = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey: `withdrawal:${current.id}:complete:locked` },
        })
        if (!already) {
          await ledgerService.completeWithdrawal(tx, {
            userId: current.userId,
            walletId: current.walletId,
            amount: d(current.amount),
            description: `Withdrawal ${current.reference} paid`,
            referenceType: 'WITHDRAWAL',
            referenceId: current.id,
            createdById: actorId,
            idempotencyKey: `withdrawal:${current.id}:complete`,
          })
        }
        await tx.financeReview.create({
          data: {
            withdrawalId: current.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_COMPLETE' ? 'FORCE_COMPLETE' : 'PAID',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        await tx.approvalQueue.updateMany({
          where: { withdrawalId: current.id },
          data: { status: 'APPROVED', resolvedAt: new Date(), assigneeId: actorId },
        })
        return tx.withdrawal.findUniqueOrThrow({ where: { id: current.id } })
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
        await tx.$executeRaw`SELECT 1 FROM withdrawals WHERE id = ${row.id}::uuid FOR UPDATE`
        const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: row.id } })

        if (current.status === nextStatus) {
          return current
        }
        if (current.status === 'PAID' || current.status === 'COMPLETED') {
          throw badRequest('Paid withdrawals cannot be cancelled; ledger already settled.')
        }
        if (!['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'].includes(current.status)) {
          throw badRequest('Withdrawal cannot be rejected from the current status.')
        }

        const claimed = await tx.withdrawal.updateMany({
          where: {
            id: current.id,
            status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] },
          },
          data: {
            status: nextStatus,
            rejectionReason: body.reason ?? null,
            reviewedById: actorId,
            reviewedAt: new Date(),
            internalNotes: body.internalNotes ?? current.internalNotes,
          },
        })
        if (claimed.count !== 1) {
          throw conflict('Withdrawal status changed concurrently; reject aborted.')
        }

        const completed = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey: `withdrawal:${current.id}:complete:locked` },
        })
        if (!completed) {
          await ledgerService.unlockFunds(tx, {
            userId: current.userId,
            walletId: current.walletId,
            amount: d(current.amount),
            description: `Withdrawal ${current.reference} ${nextStatus.toLowerCase()}`,
            referenceType: 'WITHDRAWAL',
            referenceId: current.id,
            createdById: actorId,
            // Stable key so cancel vs reject cannot double-unlock with different keys.
            idempotencyKey: `withdrawal:${current.id}:unlock`,
          })
        }
        await tx.financeReview.create({
          data: {
            withdrawalId: current.id,
            reviewerId: actorId,
            decision: body.decision === 'FORCE_CANCEL' ? 'FORCE_CANCEL' : 'REJECT',
            reason: body.reason ?? null,
            internalNotes: body.internalNotes ?? null,
          },
        })
        await tx.approvalQueue.updateMany({
          where: { withdrawalId: current.id },
          data: {
            status: body.decision === 'FORCE_CANCEL' ? 'CANCELLED' : 'REJECTED',
            resolvedAt: new Date(),
            assigneeId: actorId,
          },
        })
        return tx.withdrawal.findUniqueOrThrow({ where: { id: current.id } })
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
      if (nextStatus === 'REJECTED') {
        await transactionalMailer.withdrawalRejected(row.userId, {
          reference: row.reference,
          amount: moneyDisplay(row.amount),
          reason: body.reason ?? 'Withdrawal rejected',
        })
      }
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

  /**
   * Provider payout confirmation. Completes ledger (locked → paid) when admin already
   * approved, or when status is still PENDING/PROCESSING (ops may auto-payout).
   */
  async confirmPaidFromProvider(
    withdrawalId: string,
    input: {
      eventId: string
      transactionRef?: string
      context: Ctx
    },
  ) {
    const row = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } })
    if (!row) throw notFound('Withdrawal not found.')

    if (row.status === 'PAID' || row.status === 'COMPLETED') {
      return mapWithdrawal(row)
    }

    // Require admin approval before provider can settle (production control).
    if (!['APPROVED', 'PROCESSING'].includes(row.status)) {
      throw badRequest(
        'Withdrawal must be APPROVED by an admin before provider paid confirmation.',
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM withdrawals WHERE id = ${row.id}::uuid FOR UPDATE`
      const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: row.id } })
      if (current.status === 'PAID' || current.status === 'COMPLETED') {
        return current
      }
      if (!['APPROVED', 'PROCESSING'].includes(current.status)) {
        throw badRequest('Withdrawal cannot be marked paid from the current status.')
      }

      const claimed = await tx.withdrawal.updateMany({
        where: { id: current.id, status: { in: ['APPROVED', 'PROCESSING'] } },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          transactionRef: input.transactionRef?.slice(0, 120) ?? current.transactionRef,
          internalNotes: `Provider paid ${input.eventId}`,
        },
      })
      if (claimed.count !== 1) {
        throw conflict('Withdrawal status changed concurrently; provider paid aborted.')
      }

      const already = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey: `withdrawal:${current.id}:complete:locked` },
      })
      if (!already) {
        await ledgerService.completeWithdrawal(tx, {
          userId: current.userId,
          walletId: current.walletId,
          amount: d(current.amount),
          description: `Withdrawal ${current.reference} paid by provider`,
          referenceType: 'WITHDRAWAL',
          referenceId: current.id,
          createdById: null,
          idempotencyKey: `withdrawal:${current.id}:complete`,
        })
      }
      await tx.financeReview.create({
        data: {
          withdrawalId: current.id,
          decision: 'PROVIDER_CONFIRM',
          reason: `Webhook ${input.eventId}`,
          metadata: { eventId: input.eventId, transactionRef: input.transactionRef ?? null },
        },
      })
      await tx.approvalQueue.updateMany({
        where: { withdrawalId: current.id },
        data: { status: 'APPROVED', resolvedAt: new Date() },
      })
      return tx.withdrawal.findUniqueOrThrow({ where: { id: current.id } })
    })

    await activityService.record({
      userId: row.userId,
      kind: 'WITHDRAWAL_PAID',
      title: 'Withdrawal paid by provider',
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await auditService.record({
      actorId: null,
      targetUserId: row.userId,
      action: 'withdrawal.provider_paid',
      module: 'finance',
      oldValue: { status: row.status },
      newValue: { status: 'PAID', eventId: input.eventId },
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await notificationService.notify({
      userId: row.userId,
      kind: 'FINANCE',
      title: 'Withdrawal paid',
      body: `Withdrawal ${row.reference} has been paid.`,
      metadata: { type: 'WITHDRAWAL_PAID', withdrawalId: row.id },
    })
    return mapWithdrawal(updated)
  },

  async markFailedFromProvider(
    withdrawalId: string,
    input: { eventId: string; reason?: string; context: Ctx },
  ) {
    const row = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } })
    if (!row) throw notFound('Withdrawal not found.')
    if (row.status === 'REJECTED' || row.status === 'CANCELLED') {
      return mapWithdrawal(row)
    }
    if (row.status === 'PAID' || row.status === 'COMPLETED') {
      throw badRequest('Paid withdrawals cannot be marked failed by provider.')
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM withdrawals WHERE id = ${row.id}::uuid FOR UPDATE`
      const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: row.id } })
      if (['REJECTED', 'CANCELLED', 'PAID', 'COMPLETED'].includes(current.status)) {
        return current
      }
      if (!['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'].includes(current.status)) {
        throw badRequest('Withdrawal cannot be marked failed from the current status.')
      }

      await tx.withdrawal.update({
        where: { id: current.id },
        data: {
          status: 'REJECTED',
          rejectionReason: input.reason ?? 'Provider reported payout failed',
          reviewedAt: new Date(),
          internalNotes: `webhook:${input.eventId}`,
        },
      })

      const completed = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey: `withdrawal:${current.id}:complete:locked` },
      })
      if (!completed) {
        await ledgerService.unlockFunds(tx, {
          userId: current.userId,
          walletId: current.walletId,
          amount: d(current.amount),
          description: `Withdrawal ${current.reference} provider failed`,
          referenceType: 'WITHDRAWAL',
          referenceId: current.id,
          createdById: null,
          idempotencyKey: `withdrawal:${current.id}:unlock`,
        })
      }
      await tx.financeReview.create({
        data: {
          withdrawalId: current.id,
          decision: 'REJECT',
          reason: input.reason ?? 'Provider reported payout failed',
          metadata: { eventId: input.eventId, source: 'webhook' },
        },
      })
      await tx.approvalQueue.updateMany({
        where: { withdrawalId: current.id },
        data: { status: 'REJECTED', resolvedAt: new Date() },
      })
      return tx.withdrawal.findUniqueOrThrow({ where: { id: current.id } })
    })

    await activityService.record({
      userId: row.userId,
      kind: 'WITHDRAWAL_REJECTED',
      title: 'Withdrawal failed at provider',
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await auditService.record({
      actorId: null,
      targetUserId: row.userId,
      action: 'withdrawal.provider_failed',
      module: 'finance',
      reason: input.reason,
      ip: input.context.ip,
      userAgent: input.context.userAgent,
    })
    await notificationService.notify({
      userId: row.userId,
      kind: 'FINANCE',
      title: 'Withdrawal failed',
      body: input.reason ?? `Withdrawal ${row.reference} failed at the payment provider.`,
      metadata: { type: 'WITHDRAWAL_REJECTED', withdrawalId: row.id },
    })
    return mapWithdrawal(updated)
  },
}

function DecimalMax(a: ReturnType<typeof d>, b: ReturnType<typeof d>) {
  return a.gt(b) ? a : b
}
