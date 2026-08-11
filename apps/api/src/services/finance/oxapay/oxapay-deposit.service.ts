import type { Prisma } from '@prisma/client'

import { env } from '../../../config/env.js'
import { prisma } from '../../../database/prisma.js'
import { badRequest, serviceUnavailable } from '../../../utils/errors.js'
import { logger } from '../../../utils/logger.js'
import { d, moneyDisplay } from '../../../utils/money.js'
import { isCryptoDepositMethodType } from '@meridian/shared'
import { depositService } from '../deposit.service.js'
import { mapDeposit } from '../finance.mappers.js'
import { oxapayClient, oxapayCallbackUrl, oxapayReturnUrl } from './oxapay.client.js'
import { OXAPAY_PROVIDER } from './oxapay.types.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

/** Invoice lifetime in minutes (OxaPay allows 15–2880; default in docs is 60). */
const OXAPAY_INVOICE_LIFETIME_MINUTES = 60

function expectedNetworkForMethodType(type: string): string | null {
  switch (type) {
    case 'USDT_TRC20':
      return 'TRC20'
    case 'USDT_BEP20':
      return 'BEP20'
    case 'BTC':
      return 'BTC'
    case 'ETH':
      return 'ERC20'
    default:
      return null
  }
}

function asDetails(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

export const oxapayDepositService = {
  status() {
    return {
      enabled: oxapayClient.isConfigured(),
      sandbox: env.OXAPAY_SANDBOX,
      provider: OXAPAY_PROVIDER,
    }
  },

  /**
   * Create PENDING deposit then OxaPay invoice. Credits never happen here.
   */
  async create(
    userId: string,
    body: {
      amount: string
      methodId: string
      notes?: string
      idempotencyKey: string
      email?: string
    },
    context: Ctx,
  ) {
    if (!oxapayClient.isConfigured()) {
      throw serviceUnavailable('OxaPay crypto gateway is not configured.')
    }

    const existing = await prisma.deposit.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    if (existing) {
      if (existing.userId !== userId) throw badRequest('Idempotency key conflict.')
      const details = asDetails(existing.submissionDetails)
      if (details.gateway === OXAPAY_PROVIDER && details.oxapayPaymentUrl) {
        return {
          ...mapDeposit(existing),
          paymentUrl: String(details.oxapayPaymentUrl),
          oxapayTrackId: details.oxapayTrackId ? String(details.oxapayTrackId) : null,
          gateway: OXAPAY_PROVIDER,
        }
      }
    }

    const method = await prisma.paymentMethod.findFirst({
      where: { id: body.methodId, isActive: true, deletedAt: null },
    })
    if (!method) throw badRequest('Payment method is unavailable.')
    if (!isCryptoDepositMethodType(method.type)) {
      throw badRequest('OxaPay deposits require a crypto payment method.')
    }

    const expectedNetwork = expectedNetworkForMethodType(method.type)

    // Create internal PENDING deposit first (reuses min/max/lock/pending ledger).
    const deposit = await depositService.create(
      userId,
      {
        amount: body.amount,
        methodId: body.methodId,
        notes: body.notes,
        idempotencyKey: body.idempotencyKey,
        submissionDetails: {
          gateway: OXAPAY_PROVIDER,
          rail: 'CRYPTO',
          methodName: method.name,
          methodType: method.type,
          ...(expectedNetwork ? { expectedNetwork, network: expectedNetwork } : {}),
          oxapayStatus: 'invoice_pending',
        },
      },
      context,
    )

    const amountNumber = Number(d(body.amount).toFixed(8))
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      await depositService.cancel(userId, deposit.id, context)
      throw badRequest('Invalid deposit amount.')
    }

    const callbackUrl = oxapayCallbackUrl()
    const returnUrl = oxapayReturnUrl(deposit.reference)

    let invoice
    try {
      invoice = await oxapayClient.createInvoice({
        amount: amountNumber,
        currency: 'USD',
        lifetime: OXAPAY_INVOICE_LIFETIME_MINUTES,
        callback_url: callbackUrl,
        return_url: returnUrl,
        order_id: deposit.reference,
        email: body.email?.trim() || undefined,
        description: `Growzy deposit ${deposit.reference}`,
        sandbox: env.OXAPAY_SANDBOX,
      })
    } catch (error) {
      logger.error(
        {
          depositId: deposit.id,
          orderId: deposit.reference,
          err: error instanceof Error ? error.message : 'invoice_failed',
        },
        'OxaPay invoice creation failed',
      )
      try {
        await depositService.cancel(userId, deposit.id, context)
      } catch (cancelError) {
        logger.error(
          {
            depositId: deposit.id,
            err: cancelError instanceof Error ? cancelError.message : 'cancel_failed',
          },
          'Failed to cancel deposit after OxaPay invoice error',
        )
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'OxaPay invoice creation failed.'
      throw badRequest(message)
    }

    const expiresAt =
      typeof invoice.expired_at === 'number' && invoice.expired_at > 0
        ? new Date(invoice.expired_at * 1000)
        : new Date(Date.now() + OXAPAY_INVOICE_LIFETIME_MINUTES * 60_000)

    const prev = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    const mergedDetails = {
      ...asDetails(prev.submissionDetails),
      gateway: OXAPAY_PROVIDER,
      oxapayTrackId: String(invoice.track_id),
      oxapayPaymentUrl: String(invoice.payment_url),
      oxapayExpiredAt: String(invoice.expired_at ?? ''),
      oxapayInvoiceDate: String(invoice.date ?? ''),
      oxapayStatus: 'new',
      oxapaySandbox: env.OXAPAY_SANDBOX ? 'true' : 'false',
      oxapayOrderId: deposit.reference,
      oxapayCallbackUrl: callbackUrl,
      oxapayReturnUrl: returnUrl,
      oxapayAmountUsd: moneyDisplay(d(body.amount)),
      oxapayCurrency: 'USD',
    }

    const updated = await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        expiresAt,
        userReference: String(invoice.track_id).slice(0, 120),
        submissionDetails: mergedDetails as Prisma.InputJsonValue,
        internalNotes: `OxaPay invoice track_id=${invoice.track_id}`,
      },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })

    logger.info(
      {
        depositId: updated.id,
        orderId: updated.reference,
        oxapayTrackId: invoice.track_id,
        status: 'invoice_created',
      },
      'OxaPay invoice created',
    )

    return {
      ...mapDeposit(updated),
      paymentUrl: invoice.payment_url,
      oxapayTrackId: String(invoice.track_id),
      gateway: OXAPAY_PROVIDER,
    }
  },
}
