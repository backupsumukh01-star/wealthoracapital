import type { Deposit, Prisma } from '@prisma/client'

import { env } from '../../../config/env.js'
import { prisma } from '../../../database/prisma.js'
import { badRequest, unauthorized } from '../../../utils/errors.js'
import { logger } from '../../../utils/logger.js'
import { d, moneyDisplay, moneyString } from '../../../utils/money.js'
import { opsAlertService } from '../../ops-alert.service.js'
import { depositService } from '../deposit.service.js'
import { plisioClient } from './plisio.client.js'
import {
  buildPlisioWebhookEventId,
  isPlisioPaidStatus,
  normalizePlisioStatus,
  verifyPlisioJsonCallback,
} from './plisio.hmac.js'
import type { PlisioOperation, PlisioTx, PlisioWebhookPayload } from './plisio.types.js'
import { PLISIO_PROVIDER } from './plisio.types.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function asDetails(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

function firstTxHash(input: {
  tx?: PlisioTx[]
  txIds?: string | string[]
}): string | null {
  if (Array.isArray(input.tx)) {
    for (const row of input.tx) {
      const hash = String(row.txid ?? row.tx_id ?? '').trim()
      if (hash) return hash.slice(0, 120)
    }
  }
  if (Array.isArray(input.txIds)) {
    const hash = String(input.txIds[0] ?? '').trim()
    if (hash) return hash.slice(0, 120)
  }
  if (typeof input.txIds === 'string' && input.txIds.trim()) {
    return input.txIds.trim().slice(0, 120)
  }
  return null
}

function networkMatchesExpected(expected: string, actual: string | null): boolean {
  if (!actual) return true
  const e = expected.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const a = actual.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!e || !a) return true
  if (a.includes(e) || e.includes(a)) return true
  const aliases: Record<string, string[]> = {
    TRC20: ['TRON', 'TRX', 'TRC20', 'USDTTRX', 'USDTBSC', 'USDT', 'BSC', 'BEP20'],
    BEP20: ['BSC', 'BNB', 'BEP20', 'BINANCE', 'USDTBSC', 'USDTTRX', 'USDT', 'TRC20', 'TRX'],
    ERC20: ['ETH', 'ETHEREUM', 'ERC20', 'USDT'],
    BTC: ['BTC', 'BITCOIN'],
  }
  return Boolean(aliases[e]?.some((token) => a.includes(token)))
}

function amountsEqualUsd(expected: string, reported: number | string): boolean {
  const a = d(expected)
  const b = d(reported)
  if (!a.isFinite() || !b.isFinite()) return false
  return a.toFixed(2) === b.toFixed(2)
}

function parseWebhookBody(body: unknown): PlisioWebhookPayload {
  if (!body || typeof body !== 'object') throw badRequest('Invalid Plisio webhook payload.')
  const raw = body as Record<string, unknown>
  const txnId = String(raw.txn_id ?? raw.id ?? '').trim()
  const status = String(raw.status ?? '').trim()
  if (!txnId) throw badRequest('txn_id is required.')
  if (!status) throw badRequest('status is required.')
  return raw as PlisioWebhookPayload
}

async function resolveDeposit(input: {
  orderNumber?: string | null
  txnId: string
}): Promise<Deposit | null> {
  const orderNumber = input.orderNumber?.trim()
  if (orderNumber) {
    const byRef = await prisma.deposit.findUnique({ where: { reference: orderNumber } })
    if (byRef) return byRef
  }
  return prisma.deposit.findFirst({
    where: {
      OR: [
        { userReference: input.txnId },
        {
          submissionDetails: {
            path: ['plisioTxnId'],
            equals: input.txnId,
          },
        },
      ],
    },
  })
}

async function mergeDepositGatewayMeta(
  depositId: string,
  patch: Record<string, unknown>,
  extras?: { txHash?: string | null; internalNotes?: string },
) {
  const current = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } })
  const details = {
    ...asDetails(current.submissionDetails),
    ...patch,
  }
  try {
    await prisma.deposit.update({
      where: { id: depositId },
      data: {
        submissionDetails: details as Prisma.InputJsonValue,
        ...(extras?.txHash && !current.txHash ? { txHash: extras.txHash.slice(0, 120) } : {}),
        ...(extras?.internalNotes ? { internalNotes: extras.internalNotes.slice(0, 2000) } : {}),
      },
    })
  } catch {
    await prisma.deposit.update({
      where: { id: depositId },
      data: {
        submissionDetails: details as Prisma.InputJsonValue,
        ...(extras?.internalNotes ? { internalNotes: extras.internalNotes.slice(0, 2000) } : {}),
      },
    })
  }
}

export function verifyPlisioOperationAgainstDeposit(input: {
  deposit: Deposit
  operation: PlisioOperation
  txnId: string
  webhook?: PlisioWebhookPayload
}): { ok: true } | { ok: false; reason: string } {
  const { deposit, operation, txnId, webhook } = input
  const details = asDetails(deposit.submissionDetails)
  const opId = String(operation.id ?? '').trim()
  if (opId && opId !== txnId) {
    return { ok: false, reason: 'txn_id_mismatch' }
  }

  const storedTxn = details.plisioTxnId ? String(details.plisioTxnId) : deposit.userReference
  if (storedTxn && String(storedTxn) !== txnId) {
    return { ok: false, reason: 'deposit_txn_id_mismatch' }
  }

  // Non-white-label Plisio often omits params.order_number on GET /operations.
  // The webhook order_number (and the deposit we already resolved) is the source of truth.
  const orderNumber = String(
    operation.params?.order_number ?? webhook?.order_number ?? details.plisioOrderId ?? '',
  ).trim()
  if (orderNumber && orderNumber !== deposit.reference) {
    return { ok: false, reason: 'order_number_mismatch' }
  }

  const currency = String(
    operation.params?.source_currency ??
      operation.source_currency ??
      webhook?.source_currency ??
      '',
  )
    .trim()
    .toUpperCase()
  if (currency && currency !== 'USD') {
    return { ok: false, reason: 'currency_mismatch' }
  }

  const reportedAmount =
    operation.params?.source_amount ?? operation.source_amount ?? webhook?.source_amount
  if (reportedAmount == null || !amountsEqualUsd(moneyString(deposit.amount), reportedAmount)) {
    return { ok: false, reason: 'amount_mismatch' }
  }

  const status = normalizePlisioStatus(operation.status || webhook?.status)
  if (!isPlisioPaidStatus(status)) {
    return { ok: false, reason: `payment_status_${status}` }
  }

  const expectedNetwork =
    typeof details.expectedNetwork === 'string' ? details.expectedNetwork.trim() : ''
  if (expectedNetwork) {
    const actual = String(
      operation.psys_cid ??
        operation.currency ??
        operation.params?.currency ??
        webhook?.psys_cid ??
        webhook?.currency ??
        '',
    ).trim()
    if (actual && !networkMatchesExpected(expectedNetwork, actual)) {
      return { ok: false, reason: 'network_mismatch' }
    }
  }

  return { ok: true }
}

export const plisioWebhookService = {
  async ingest(input: { rawBody: string; body: unknown; context: Ctx }) {
    const apiKey = env.PLISIO_API_KEY?.trim()
    if (!apiKey) {
      throw unauthorized('Plisio API key is not configured.')
    }

    const parsed =
      input.body && typeof input.body === 'object'
        ? (input.body as Record<string, unknown>)
        : (() => {
            try {
              return JSON.parse(input.rawBody) as Record<string, unknown>
            } catch {
              throw badRequest('Invalid Plisio webhook payload.')
            }
          })()

    if (!verifyPlisioJsonCallback(parsed, apiKey)) {
      logger.warn({ hasHash: Boolean(parsed.verify_hash) }, 'Plisio webhook invalid HMAC')
      throw unauthorized('Invalid Plisio webhook signature.')
    }

    const payload = parseWebhookBody(parsed)
    const txnId = String(payload.txn_id).trim()
    const normalizedStatus = normalizePlisioStatus(payload.status)
    const txHash = firstTxHash({
      txIds: payload.tx_id,
    })
    const eventId = buildPlisioWebhookEventId({
      txnId,
      status: payload.status,
      txHash: isPlisioPaidStatus(normalizedStatus) ? txHash : null,
    })

    logger.info(
      {
        plisioTxnId: txnId,
        orderId: payload.order_number ?? null,
        status: normalizedStatus,
        eventId,
      },
      'Plisio webhook received',
    )

    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider: PLISIO_PROVIDER, eventId } },
    })
    if (existing) {
      if (
        existing.depositId &&
        typeof existing.errorMessage === 'string' &&
        existing.errorMessage.startsWith('Verification failed')
      ) {
        const deposit = await prisma.deposit.findUnique({ where: { id: existing.depositId } })
        if (deposit && ['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
          const result = await this.processEvent(existing.id, payload, input.context)
          return { duplicate: false as const, retried: true as const, eventId, ...result }
        }
      }
      return {
        duplicate: true as const,
        eventId,
        status: existing.status,
        depositId: existing.depositId,
      }
    }

    let eventRow
    try {
      eventRow = await prisma.paymentWebhookEvent.create({
        data: {
          provider: PLISIO_PROVIDER,
          eventId,
          eventType: `plisio.${String(normalizedStatus).replace(/\s+/g, '_')}`,
          signature: String(payload.verify_hash ?? '').slice(0, 256) || null,
          payload: parsed as Prisma.InputJsonValue,
          status: 'RECEIVED',
        },
      })
    } catch {
      const again = await prisma.paymentWebhookEvent.findUnique({
        where: { provider_eventId: { provider: PLISIO_PROVIDER, eventId } },
      })
      if (again) {
        if (
          again.depositId &&
          typeof again.errorMessage === 'string' &&
          again.errorMessage.startsWith('Verification failed')
        ) {
          const deposit = await prisma.deposit.findUnique({ where: { id: again.depositId } })
          if (deposit && ['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
            const result = await this.processEvent(again.id, payload, input.context)
            return { duplicate: false as const, retried: true as const, eventId, ...result }
          }
        }
        return {
          duplicate: true as const,
          eventId,
          status: again.status,
          depositId: again.depositId,
        }
      }
      throw badRequest('Failed to persist Plisio webhook event.')
    }

    try {
      const result = await this.processEvent(eventRow.id, payload, input.context)
      return { duplicate: false as const, eventId, ...result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Plisio webhook processing failed'
      await prisma.paymentWebhookEvent.update({
        where: { id: eventRow.id },
        data: {
          status: 'FAILED',
          errorMessage: message.slice(0, 1000),
          processedAt: new Date(),
        },
      })
      logger.error(
        {
          eventId,
          plisioTxnId: txnId,
          orderId: payload.order_number ?? null,
          status: normalizedStatus,
          err: message,
        },
        'Plisio webhook failed',
      )
      await opsAlertService.notify({
        event: 'PAYMENT_WEBHOOK_FAILED',
        title: 'Plisio webhook failed',
        action: message,
        reference: eventId,
        ip: input.context.ip,
        adminPath: `/admin/deposits`,
        details: {
          TxnId: txnId,
          OrderId: payload.order_number ?? '—',
          Status: normalizedStatus,
        },
      })
      throw error
    }
  },

  async processEvent(webhookEventId: string, payload: PlisioWebhookPayload, context: Ctx) {
    const txnId = String(payload.txn_id).trim()
    const normalizedStatus = normalizePlisioStatus(payload.status)
    const orderNumber = payload.order_number ? String(payload.order_number).trim() : null
    const deposit = await resolveDeposit({ orderNumber, txnId })

    if (!deposit) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: 'IGNORED',
          errorMessage: 'Deposit not found for Plisio order_number/txn_id',
          processedAt: new Date(),
        },
      })
      logger.warn(
        { plisioTxnId: txnId, orderId: orderNumber, status: normalizedStatus },
        'Plisio webhook deposit not found',
      )
      return { action: 'ignored' as const, reason: 'deposit_not_found' }
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEventId },
      data: { depositId: deposit.id },
    })

    const txHash = firstTxHash({ txIds: payload.tx_id })

    await mergeDepositGatewayMeta(
      deposit.id,
      {
        plisioStatus: normalizedStatus,
        plisioLastWebhookAt: new Date().toISOString(),
        plisioTxnId: txnId,
        plisioOrderId: orderNumber ?? deposit.reference,
        ...(payload.currency ? { plisioPaidCurrency: String(payload.currency) } : {}),
        ...(payload.source_amount != null ? { plisioPaidAmount: String(payload.source_amount) } : {}),
        ...(txHash ? { plisioTxHash: txHash } : {}),
      },
      {
        txHash,
        internalNotes: `Plisio webhook status=${normalizedStatus} txn_id=${txnId}`,
      },
    )

    if (normalizedStatus === 'expired' || normalizedStatus === 'cancelled') {
      if (['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
        await depositService.markFailedFromProvider(deposit.id, {
          eventId: `plisio:${txnId}:${normalizedStatus}`,
          reason: `Plisio payment ${normalizedStatus}`,
          context,
        })
      }
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return { action: 'rejected' as const, depositId: deposit.id, status: normalizedStatus }
    }

    if (
      normalizedStatus === 'new' ||
      normalizedStatus === 'pending' ||
      normalizedStatus === 'pending internal' ||
      normalizedStatus === 'cancelled duplicate' ||
      normalizedStatus === 'error' ||
      normalizedStatus === 'unknown'
    ) {
      if (normalizedStatus === 'error') {
        await prisma.deposit.updateMany({
          where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
          data: {
            status: 'UNDER_REVIEW',
            internalNotes: `Plisio ${normalizedStatus} — no auto-credit. txn_id=${txnId}`.slice(0, 2000),
          },
        })
      }
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return {
        action: 'status_updated' as const,
        depositId: deposit.id,
        status: normalizedStatus,
      }
    }

    if (deposit.status === 'APPROVED') {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return { action: 'already_approved' as const, depositId: deposit.id, status: normalizedStatus }
    }

    let operation: PlisioOperation
    try {
      operation = await plisioClient.getOperation(txnId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'operation_fetch_failed'
      await mergeDepositGatewayMeta(
        deposit.id,
        { plisioVerificationError: message, plisioStatus: normalizedStatus },
        { internalNotes: `Plisio completed webhook but operation fetch failed: ${message}`.slice(0, 2000) },
      )
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { status: 'UNDER_REVIEW' },
      })
      throw badRequest(`Plisio payment verification failed: ${message}`)
    }

    const verification = verifyPlisioOperationAgainstDeposit({
      deposit,
      operation,
      txnId,
      webhook: payload,
    })
    if (!verification.ok) {
      await mergeDepositGatewayMeta(
        deposit.id,
        {
          plisioVerificationResult: verification.reason,
          plisioVerifiedStatus: String(operation.status ?? ''),
          plisioVerifiedOrderId: String(operation.params?.order_number ?? ''),
        },
        {
          txHash: firstTxHash({ tx: operation.tx, txIds: operation.tx_id }) ?? txHash,
          internalNotes: `Plisio verification failed: ${verification.reason}`.slice(0, 2000),
        },
      )
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { status: 'UNDER_REVIEW' },
      })
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: 'PROCESSED',
          errorMessage: `Verification failed: ${verification.reason}`.slice(0, 1000),
          processedAt: new Date(),
        },
      })
      await opsAlertService.notify({
        event: 'PAYMENT_WEBHOOK_FAILED',
        title: 'Plisio deposit verification failed',
        action: verification.reason,
        reference: deposit.reference,
        ip: context.ip,
        adminPath: `/admin/deposits/${deposit.id}`,
        details: {
          TxnId: txnId,
          Reason: verification.reason,
          ExpectedAmount: moneyDisplay(deposit.amount),
        },
      })
      return { action: 'verification_failed' as const, depositId: deposit.id, reason: verification.reason }
    }

    const creditTxHash = firstTxHash({ tx: operation.tx, txIds: operation.tx_id }) ?? txHash ?? undefined

    if (!env.PAYMENT_AUTO_CONFIRM_DEPOSITS) {
      await mergeDepositGatewayMeta(
        deposit.id,
        {
          plisioVerificationResult: 'ok',
          plisioVerifiedAt: new Date().toISOString(),
          plisioStatus: 'completed',
          plisioAwaitingAdminApproval: 'true',
        },
        {
          txHash: creditTxHash,
          internalNotes: `Plisio completed+verified; awaiting admin txn_id=${txnId}`.slice(0, 2000),
        },
      )
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { status: 'UNDER_REVIEW', txHash: creditTxHash?.slice(0, 120) ?? undefined },
      })
      await prisma.financeReview.create({
        data: {
          depositId: deposit.id,
          decision: 'PROVIDER_CONFIRM',
          reason: 'Plisio paid and verified — auto-confirm disabled',
          metadata: { txnId, eventId: webhookEventId, autoConfirm: false },
        },
      })
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return { action: 'queued_for_admin' as const, depositId: deposit.id, status: normalizedStatus }
    }

    await mergeDepositGatewayMeta(
      deposit.id,
      {
        plisioVerificationResult: 'ok',
        plisioVerifiedAt: new Date().toISOString(),
        plisioConfirmedAt: new Date().toISOString(),
        plisioStatus: 'completed',
        plisioAwaitingAdminApproval: 'false',
      },
      { txHash: creditTxHash },
    )

    const credited = await depositService.confirmFromProvider(deposit.id, {
      amount: moneyString(deposit.amount),
      eventId: `plisio:${txnId}:completed`,
      txHash: creditTxHash,
      context,
    })

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'PROCESSED', processedAt: new Date() },
    })

    logger.info(
      {
        depositId: deposit.id,
        plisioTxnId: txnId,
        orderId: deposit.reference,
        status: 'completed',
        creditedAmount: credited,
        action: 'auto_confirmed',
      },
      'Plisio deposit auto-confirmed via verified completed webhook',
    )

    return {
      action: 'auto_confirmed' as const,
      depositId: deposit.id,
      creditedAmount: credited,
      status: normalizedStatus,
    }
  },
}
