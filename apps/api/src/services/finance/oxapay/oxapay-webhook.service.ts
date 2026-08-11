import type { Deposit, Prisma } from '@prisma/client'

import { env } from '../../../config/env.js'
import { prisma } from '../../../database/prisma.js'
import { badRequest, unauthorized } from '../../../utils/errors.js'
import { logger } from '../../../utils/logger.js'
import { d, moneyDisplay, moneyString } from '../../../utils/money.js'
import { opsAlertService } from '../../ops-alert.service.js'
import { depositService } from '../deposit.service.js'
import { oxapayClient } from './oxapay.client.js'
import {
  buildOxapayWebhookEventId,
  normalizeOxapayStatus,
  verifyOxapayWebhookHmac,
} from './oxapay.hmac.js'
import type { OxapayPaymentInfo, OxapayTx, OxapayWebhookPayload } from './oxapay.types.js'
import { OXAPAY_PROVIDER } from './oxapay.types.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function asDetails(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

function firstTxHash(txs: OxapayTx[] | undefined): string | null {
  if (!Array.isArray(txs)) return null
  for (const tx of txs) {
    const hash = typeof tx.tx_hash === 'string' ? tx.tx_hash.trim() : ''
    if (hash) return hash.slice(0, 120)
  }
  return null
}

function firstNetwork(txs: OxapayTx[] | undefined): string | null {
  if (!Array.isArray(txs)) return null
  for (const tx of txs) {
    const network = typeof tx.network === 'string' ? tx.network.trim() : ''
    if (network) return network
  }
  return null
}

function networkMatchesExpected(expected: string, actual: string | null): boolean {
  if (!actual) return true // network not yet available — do not fail open on paid; caller gates
  const e = expected.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const a = actual.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!e || !a) return true
  if (a.includes(e) || e.includes(a)) return true
  // Common OxaPay / chain aliases
  const aliases: Record<string, string[]> = {
    TRC20: ['TRON', 'TRX', 'TRC20'],
    BEP20: ['BSC', 'BNB', 'BEP20', 'BINANCE'],
    ERC20: ['ETH', 'ETHEREUM', 'ERC20'],
    BTC: ['BTC', 'BITCOIN'],
  }
  const group = aliases[e]
  if (group?.some((token) => a.includes(token))) return true
  return false
}

function amountsEqualUsd(expected: string, reported: number | string): boolean {
  const a = d(expected)
  const b = d(reported)
  if (!a.isFinite() || !b.isFinite()) return false
  return a.toFixed(8) === b.toFixed(8)
}

function parseWebhookBody(body: unknown): OxapayWebhookPayload {
  if (!body || typeof body !== 'object') throw badRequest('Invalid OxaPay webhook payload.')
  const raw = body as Record<string, unknown>
  const trackId = String(raw.track_id ?? '').trim()
  const status = String(raw.status ?? '').trim()
  if (!trackId) throw badRequest('track_id is required.')
  if (!status) throw badRequest('status is required.')
  return raw as OxapayWebhookPayload
}

async function resolveDeposit(input: {
  orderId?: string | null
  trackId: string
}): Promise<Deposit | null> {
  const orderId = input.orderId?.trim()
  if (orderId) {
    const byRef = await prisma.deposit.findUnique({ where: { reference: orderId } })
    if (byRef) return byRef
  }
  const byTrack = await prisma.deposit.findFirst({
    where: {
      OR: [
        { userReference: input.trackId },
        {
          submissionDetails: {
            path: ['oxapayTrackId'],
            equals: input.trackId,
          },
        },
      ],
    },
  })
  return byTrack
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
        ...(extras?.txHash && !current.txHash
          ? { txHash: extras.txHash.slice(0, 120) }
          : {}),
        ...(extras?.internalNotes
          ? { internalNotes: extras.internalNotes.slice(0, 2000) }
          : {}),
      },
    })
  } catch (error) {
    // Unique txHash conflict — still persist gateway metadata without the hash.
    await prisma.deposit.update({
      where: { id: depositId },
      data: {
        submissionDetails: details as Prisma.InputJsonValue,
        ...(extras?.internalNotes
          ? { internalNotes: extras.internalNotes.slice(0, 2000) }
          : {}),
      },
    })
    logger.warn(
      {
        depositId,
        err: error instanceof Error ? error.message : 'txHash_conflict',
      },
      'OxaPay deposit metadata update skipped conflicting txHash',
    )
  }
}

/**
 * Verify GET /payment/{track_id} against the Growzy deposit before any credit.
 * Returns null reason when OK; otherwise a discrepancy code.
 */
export function verifyOxapayPaymentAgainstDeposit(input: {
  deposit: Deposit
  payment: OxapayPaymentInfo
  trackId: string
}): { ok: true } | { ok: false; reason: string } {
  const { deposit, payment, trackId } = input
  const details = asDetails(deposit.submissionDetails)

  if (String(payment.track_id) !== String(trackId)) {
    return { ok: false, reason: 'track_id_mismatch' }
  }

  const storedTrack = details.oxapayTrackId ? String(details.oxapayTrackId) : deposit.userReference
  if (storedTrack && String(storedTrack) !== String(payment.track_id)) {
    return { ok: false, reason: 'deposit_track_id_mismatch' }
  }

  const orderId = payment.order_id ? String(payment.order_id).trim() : ''
  if (!orderId || orderId !== deposit.reference) {
    return { ok: false, reason: 'order_id_mismatch' }
  }

  const currency = String(payment.currency ?? '')
    .trim()
    .toUpperCase()
  if (currency !== 'USD') {
    return { ok: false, reason: 'currency_mismatch' }
  }

  if (!amountsEqualUsd(moneyString(deposit.amount), payment.amount)) {
    return { ok: false, reason: 'amount_mismatch' }
  }

  const status = normalizeOxapayStatus(payment.status)
  if (status !== 'paid') {
    return { ok: false, reason: `payment_status_${status}` }
  }

  const expectedNetwork =
    typeof details.expectedNetwork === 'string' ? details.expectedNetwork.trim() : ''
  if (expectedNetwork) {
    const actual = firstNetwork(payment.txs)
    if (!actual) {
      return { ok: false, reason: 'network_missing' }
    }
    if (!networkMatchesExpected(expectedNetwork, actual)) {
      return { ok: false, reason: 'network_mismatch' }
    }
  }

  return { ok: true }
}

export const oxapayWebhookService = {
  async ingest(input: {
    rawBody: string
    body: unknown
    hmacHeader?: string
    context: Ctx
  }) {
    const merchantKey = env.OXAPAY_MERCHANT_API_KEY?.trim()
    if (!merchantKey) {
      throw unauthorized('OxaPay merchant API key is not configured.')
    }

    if (
      !verifyOxapayWebhookHmac({
        rawBody: input.rawBody,
        hmacHeader: input.hmacHeader,
        merchantApiKey: merchantKey,
      })
    ) {
      logger.warn({ hasHmac: Boolean(input.hmacHeader) }, 'OxaPay webhook invalid HMAC')
      throw unauthorized('Invalid OxaPay webhook signature.')
    }

    const payload = parseWebhookBody(input.body)
    const trackId = String(payload.track_id).trim()
    const normalizedStatus = normalizeOxapayStatus(payload.status)
    const txHash = firstTxHash(payload.txs)
    const eventId = buildOxapayWebhookEventId({
      trackId,
      status: payload.status,
      txHash: normalizedStatus === 'paid' ? txHash : null,
    })

    logger.info(
      {
        oxapayTrackId: trackId,
        orderId: payload.order_id ?? null,
        status: normalizedStatus,
        eventId,
      },
      'OxaPay webhook received',
    )

    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider: OXAPAY_PROVIDER, eventId } },
    })
    if (existing) {
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
          provider: OXAPAY_PROVIDER,
          eventId,
          eventType: `oxapay.${normalizedStatus}`,
          signature: (input.hmacHeader ?? '').slice(0, 256) || null,
          payload: input.body as Prisma.InputJsonValue,
          status: 'RECEIVED',
        },
      })
    } catch {
      const again = await prisma.paymentWebhookEvent.findUnique({
        where: { provider_eventId: { provider: OXAPAY_PROVIDER, eventId } },
      })
      if (again) {
        return {
          duplicate: true as const,
          eventId,
          status: again.status,
          depositId: again.depositId,
        }
      }
      throw badRequest('Failed to persist OxaPay webhook event.')
    }

    try {
      const result = await this.processEvent(eventRow.id, payload, input.context)
      return { duplicate: false as const, eventId, ...result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OxaPay webhook processing failed'
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
          oxapayTrackId: trackId,
          orderId: payload.order_id ?? null,
          status: normalizedStatus,
          err: message,
        },
        'OxaPay webhook failed',
      )
      await opsAlertService.notify({
        event: 'PAYMENT_WEBHOOK_FAILED',
        title: 'OxaPay webhook failed',
        action: message,
        reference: eventId,
        ip: input.context.ip,
        adminPath: `/admin/deposits`,
        details: {
          TrackId: trackId,
          OrderId: payload.order_id ?? '—',
          Status: normalizedStatus,
        },
      })
      throw error
    }
  },

  async processEvent(webhookEventId: string, payload: OxapayWebhookPayload, context: Ctx) {
    const trackId = String(payload.track_id).trim()
    const normalizedStatus = normalizeOxapayStatus(payload.status)
    const orderId = payload.order_id ? String(payload.order_id).trim() : null
    const deposit = await resolveDeposit({ orderId, trackId })

    if (!deposit) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: 'IGNORED',
          errorMessage: 'Deposit not found for OxaPay order_id/track_id',
          processedAt: new Date(),
        },
      })
      logger.warn(
        { oxapayTrackId: trackId, orderId, status: normalizedStatus },
        'OxaPay webhook deposit not found',
      )
      return { action: 'ignored' as const, reason: 'deposit_not_found' }
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEventId },
      data: { depositId: deposit.id },
    })

    const txHash = firstTxHash(payload.txs)
    const network = firstNetwork(payload.txs)

    await mergeDepositGatewayMeta(
      deposit.id,
      {
        oxapayStatus: normalizedStatus,
        oxapayLastWebhookAt: new Date().toISOString(),
        oxapayTrackId: trackId,
        oxapayOrderId: orderId ?? deposit.reference,
        ...(network ? { oxapayNetwork: network, network } : {}),
        ...(payload.currency ? { oxapayPaidCurrency: String(payload.currency) } : {}),
        ...(payload.amount != null ? { oxapayPaidAmount: String(payload.amount) } : {}),
        ...(payload.value != null ? { oxapayPaidValue: String(payload.value) } : {}),
        ...(txHash ? { oxapayTxHash: txHash } : {}),
      },
      {
        txHash,
        internalNotes: `OxaPay webhook status=${normalizedStatus} track_id=${trackId}`,
      },
    )

    // Non-credit statuses
    if (normalizedStatus === 'expired' || normalizedStatus === 'refunded') {
      if (['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
        await depositService.markFailedFromProvider(deposit.id, {
          eventId: `oxapay:${trackId}:${normalizedStatus}`,
          reason: `OxaPay payment ${normalizedStatus}`,
          context,
        })
      }
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return {
        action: 'rejected' as const,
        depositId: deposit.id,
        status: normalizedStatus,
      }
    }

    if (
      normalizedStatus === 'new' ||
      normalizedStatus === 'waiting' ||
      normalizedStatus === 'paying' ||
      normalizedStatus === 'underpaid' ||
      normalizedStatus === 'refunding' ||
      normalizedStatus === 'manual_accept' ||
      normalizedStatus === 'unknown'
    ) {
      if (normalizedStatus === 'underpaid' || normalizedStatus === 'manual_accept') {
        await prisma.deposit.updateMany({
          where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
          data: {
            status: 'UNDER_REVIEW',
            internalNotes: `OxaPay ${normalizedStatus} — no auto-credit. track_id=${trackId}`.slice(
              0,
              2000,
            ),
          },
        })
      }
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      logger.info(
        {
          depositId: deposit.id,
          oxapayTrackId: trackId,
          orderId: deposit.reference,
          status: normalizedStatus,
          verificationResult: 'no_credit',
        },
        'OxaPay webhook acknowledged without credit',
      )
      return {
        action: 'status_updated' as const,
        depositId: deposit.id,
        status: normalizedStatus,
      }
    }

    // paid — verify via Payment Information API before any credit
    if (deposit.status === 'APPROVED') {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return {
        action: 'already_approved' as const,
        depositId: deposit.id,
        status: normalizedStatus,
      }
    }

    let payment: OxapayPaymentInfo
    try {
      payment = await oxapayClient.getPayment(trackId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'payment_info_failed'
      await mergeDepositGatewayMeta(deposit.id, {
        oxapayVerificationError: message,
        oxapayStatus: normalizedStatus,
      }, {
        internalNotes: `OxaPay paid webhook but payment info fetch failed: ${message}`.slice(0, 2000),
      })
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { status: 'UNDER_REVIEW' },
      })
      throw badRequest(`OxaPay payment verification failed: ${message}`)
    }

    const verification = verifyOxapayPaymentAgainstDeposit({
      deposit,
      payment,
      trackId,
    })

    if (!verification.ok) {
      await mergeDepositGatewayMeta(
        deposit.id,
        {
          oxapayVerificationResult: verification.reason,
          oxapayVerifiedAmount: String(payment.amount),
          oxapayVerifiedCurrency: String(payment.currency),
          oxapayVerifiedStatus: String(payment.status),
          oxapayVerifiedOrderId: payment.order_id ? String(payment.order_id) : '',
        },
        {
          txHash: firstTxHash(payment.txs) ?? txHash,
          internalNotes: `OxaPay verification failed: ${verification.reason}`.slice(0, 2000),
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
      logger.warn(
        {
          depositId: deposit.id,
          oxapayTrackId: trackId,
          orderId: deposit.reference,
          status: normalizedStatus,
          verificationResult: verification.reason,
        },
        'OxaPay paid webhook failed verification — no credit',
      )
      await opsAlertService.notify({
        event: 'PAYMENT_WEBHOOK_FAILED',
        title: 'OxaPay deposit verification failed',
        action: verification.reason,
        reference: deposit.reference,
        ip: context.ip,
        adminPath: `/admin/deposits/${deposit.id}`,
        details: {
          TrackId: trackId,
          Reason: verification.reason,
          ExpectedAmount: moneyDisplay(deposit.amount),
          ReportedAmount: String(payment.amount),
          ReportedCurrency: String(payment.currency),
        },
      })
      return {
        action: 'verification_failed' as const,
        depositId: deposit.id,
        reason: verification.reason,
      }
    }

    const creditTxHash = firstTxHash(payment.txs) ?? txHash ?? undefined

    // Verified paid — auto-credit only when PAYMENT_AUTO_CONFIRM_DEPOSITS=true.
    // Manual/non-gateway deposits are unaffected (they never reach this path).
    if (!env.PAYMENT_AUTO_CONFIRM_DEPOSITS) {
      await mergeDepositGatewayMeta(
        deposit.id,
        {
          oxapayVerificationResult: 'ok',
          oxapayVerifiedAt: new Date().toISOString(),
          oxapayStatus: 'paid',
          oxapayAwaitingAdminApproval: 'true',
        },
        {
          txHash: creditTxHash,
          internalNotes: `OxaPay paid+verified; awaiting admin (PAYMENT_AUTO_CONFIRM_DEPOSITS=false) track_id=${trackId}`.slice(
            0,
            2000,
          ),
        },
      )
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: {
          status: 'UNDER_REVIEW',
          txHash: creditTxHash?.slice(0, 120) ?? undefined,
        },
      })
      await prisma.financeReview.create({
        data: {
          depositId: deposit.id,
          decision: 'PROVIDER_CONFIRM',
          reason: 'OxaPay paid and verified — auto-confirm disabled',
          metadata: { trackId, eventId: webhookEventId, autoConfirm: false },
        },
      })
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      await opsAlertService.notify({
        event: 'DEPOSIT_PROVIDER_VERIFIED',
        title: 'OxaPay payment verified',
        action: 'OxaPay paid+verified; awaiting admin approval (auto-confirm off)',
        userId: deposit.userId,
        amount: moneyDisplay(deposit.amount),
        reference: deposit.reference,
        ip: context.ip,
        adminPath: `/admin/deposits/${deposit.id}`,
        idempotencyKey: `deposit.oxapay.verified:${deposit.id}:${trackId}`,
        details: {
          'OxaPay track ID': trackId,
          'Transaction hash': creditTxHash ?? null,
          'Auto-confirmed': 'no',
        },
      })
      return {
        action: 'queued_for_admin' as const,
        depositId: deposit.id,
        status: normalizedStatus,
      }
    }

    await mergeDepositGatewayMeta(deposit.id, {
      oxapayVerificationResult: 'ok',
      oxapayVerifiedAt: new Date().toISOString(),
      oxapayConfirmedAt: new Date().toISOString(),
      oxapayStatus: 'paid',
      oxapayAwaitingAdminApproval: 'false',
    }, {
      txHash: creditTxHash,
    })

    const credited = await depositService.confirmFromProvider(deposit.id, {
      amount: moneyString(deposit.amount),
      eventId: `oxapay:${trackId}:paid`,
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
        oxapayTrackId: trackId,
        orderId: deposit.reference,
        status: 'paid',
        verificationResult: 'ok',
        creditedAmount: credited,
        action: 'auto_confirmed',
      },
      'OxaPay deposit auto-confirmed via verified paid webhook',
    )

    return {
      action: 'auto_confirmed' as const,
      depositId: deposit.id,
      creditedAmount: credited,
      status: normalizedStatus,
    }
  },
}
