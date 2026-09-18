import type { Prisma } from '@prisma/client'
import { isCryptoDepositMethodType } from '@meridian/shared'

import { prisma } from '../../../database/prisma.js'
import { badRequest, serviceUnavailable } from '../../../utils/errors.js'
import { logger } from '../../../utils/logger.js'
import { d, moneyDisplay } from '../../../utils/money.js'
import { depositService } from '../deposit.service.js'
import { mapDeposit } from '../finance.mappers.js'
import { plisioCallbackUrl, plisioClient, plisioReturnUrl } from './plisio.client.js'
import { PLISIO_PROVIDER } from './plisio.types.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

const PLISIO_INVOICE_LIFETIME_MINUTES = 60

function plisioCurrencyForMethodType(type: string): string | null {
  switch (type) {
    case 'USDT_TRC20':
      return 'USDT_TRX'
    case 'USDT_BEP20':
      return 'USDT_BSC'
    case 'BTC':
      return 'BTC'
    case 'ETH':
      return 'ETH'
    default:
      return null
  }
}

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

export const plisioDepositService = {
  status() {
    return {
      enabled: plisioClient.isConfigured(),
      sandbox: false,
      provider: PLISIO_PROVIDER,
    }
  },

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
    if (!plisioClient.isConfigured()) {
      throw serviceUnavailable('Plisio crypto gateway is not configured.')
    }

    const existing = await prisma.deposit.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    if (existing) {
      if (existing.userId !== userId) throw badRequest('Idempotency key conflict.')
      const details = asDetails(existing.submissionDetails)
      if (details.gateway === PLISIO_PROVIDER && details.plisioInvoiceUrl) {
        return {
          ...mapDeposit(existing),
          paymentUrl: String(details.plisioInvoiceUrl),
          oxapayTrackId: details.plisioTxnId ? String(details.plisioTxnId) : null,
          gateway: PLISIO_PROVIDER,
        }
      }
    }

    const method = await prisma.paymentMethod.findFirst({
      where: { id: body.methodId, isActive: true, deletedAt: null },
    })
    if (!method) throw badRequest('Payment method is unavailable.')
    if (!isCryptoDepositMethodType(method.type)) {
      throw badRequest('Plisio deposits require a crypto payment method.')
    }

    const expectedNetwork = expectedNetworkForMethodType(method.type)
    const plisioCurrency = plisioCurrencyForMethodType(method.type)

    const deposit = await depositService.create(
      userId,
      {
        amount: body.amount,
        methodId: body.methodId,
        notes: body.notes,
        idempotencyKey: body.idempotencyKey,
        submissionDetails: {
          gateway: PLISIO_PROVIDER,
          rail: 'CRYPTO',
          methodName: method.name,
          methodType: method.type,
          ...(expectedNetwork ? { expectedNetwork, network: expectedNetwork } : {}),
          ...(plisioCurrency ? { plisioCurrency } : {}),
          plisioStatus: 'invoice_pending',
        },
      },
      context,
    )

    const amountNumber = Number(d(body.amount).toFixed(8))
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      await depositService.cancel(userId, deposit.id, context)
      throw badRequest('Invalid deposit amount.')
    }

    const callbackUrl = plisioCallbackUrl()
    const returnUrl = plisioReturnUrl(deposit.reference)

    let invoice
    try {
      invoice = await plisioClient.createInvoice({
        orderName: `Wealthora deposit ${deposit.reference}`,
        orderNumber: deposit.reference,
        sourceAmount: d(body.amount).toFixed(2),
        sourceCurrency: 'USD',
        currency: plisioCurrency ?? undefined,
        allowedPsysCids: plisioCurrency ?? undefined,
        email: body.email?.trim() || undefined,
        description: `Wealthora deposit ${deposit.reference}`,
        callbackUrl,
        successInvoiceUrl: returnUrl,
        failInvoiceUrl: returnUrl,
        expireMin: PLISIO_INVOICE_LIFETIME_MINUTES,
      })
    } catch (error) {
      logger.error(
        {
          depositId: deposit.id,
          orderId: deposit.reference,
          err: error instanceof Error ? error.message : 'invoice_failed',
        },
        'Plisio invoice creation failed',
      )
      try {
        await depositService.cancel(userId, deposit.id, context)
      } catch (cancelError) {
        logger.error(
          {
            depositId: deposit.id,
            err: cancelError instanceof Error ? cancelError.message : 'cancel_failed',
          },
          'Failed to cancel deposit after Plisio invoice error',
        )
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Plisio invoice creation failed.'
      throw badRequest(message)
    }

    const expiresAt = new Date(Date.now() + PLISIO_INVOICE_LIFETIME_MINUTES * 60_000)

    const prev = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })
    const mergedDetails = {
      ...asDetails(prev.submissionDetails),
      gateway: PLISIO_PROVIDER,
      plisioTxnId: String(invoice.txn_id),
      plisioInvoiceUrl: String(invoice.invoice_url),
      plisioStatus: 'new',
      plisioOrderId: deposit.reference,
      plisioCallbackUrl: callbackUrl,
      plisioReturnUrl: returnUrl,
      plisioAmountUsd: moneyDisplay(d(body.amount)),
      plisioCurrency: plisioCurrency ?? 'USD',
    }

    const updated = await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        expiresAt,
        userReference: String(invoice.txn_id).slice(0, 120),
        submissionDetails: mergedDetails as Prisma.InputJsonValue,
        internalNotes: `Plisio invoice txn_id=${invoice.txn_id}`,
      },
      include: { paymentMethod: { select: { id: true, name: true, type: true } } },
    })

    logger.info(
      {
        depositId: updated.id,
        orderId: updated.reference,
        plisioTxnId: invoice.txn_id,
        status: 'invoice_created',
      },
      'Plisio invoice created',
    )

    return {
      ...mapDeposit(updated),
      paymentUrl: invoice.invoice_url,
      oxapayTrackId: String(invoice.txn_id),
      gateway: PLISIO_PROVIDER,
    }
  },
}
