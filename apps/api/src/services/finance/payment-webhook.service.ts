import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Prisma } from '@prisma/client'

import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { badRequest, unauthorized } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { opsAlertService } from '../ops-alert.service.js'
import { depositService } from './deposit.service.js'
import { withdrawalService } from './withdrawal.service.js'

export type PaymentWebhookPayload = {
  eventId: string
  eventType:
    | 'deposit.confirmed'
    | 'deposit.failed'
    | 'withdrawal.paid'
    | 'withdrawal.failed'
  /** Deposit/withdrawal platform reference, e.g. DEP-… / WDR-… */
  reference?: string
  orderId?: string
  amount?: string
  currency?: string
  txHash?: string
  providerTxId?: string
  occurredAt?: string
  /** Provider-specific passthrough */
  meta?: Record<string, unknown>
}

function normalizeSignatureHeader(header: string | undefined): string {
  if (!header) return ''
  const trimmed = header.trim()
  if (trimmed.toLowerCase().startsWith('sha256=')) return trimmed.slice(7).trim()
  return trimmed
}

function hmacHex(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length || ba.length === 0) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

/**
 * Verify provider webhook signature.
 * Headers accepted: `x-growzy-signature`, `x-payment-signature`, `x-nowpayments-sig`.
 */
export function verifyPaymentWebhookSignature(input: {
  rawBody: string
  signatureHeader?: string
  nowpaymentsSig?: string
}): void {
  const secret = env.PAYMENT_WEBHOOK_SECRET
  if (!secret) {
    if (env.PAYMENT_WEBHOOK_ALLOW_UNSIGNED) {
      // Explicit opt-in for local/integration tests only.
      return
    }
    throw unauthorized('Payment webhook secret is not configured.')
  }

  const expected = hmacHex(secret, input.rawBody)
  const candidates = [
    normalizeSignatureHeader(input.signatureHeader),
    normalizeSignatureHeader(input.nowpaymentsSig),
  ].filter(Boolean)

  if (candidates.length === 0) {
    throw unauthorized('Missing payment webhook signature.')
  }
  if (!candidates.some((sig) => safeEqualHex(sig, expected))) {
    throw unauthorized('Invalid payment webhook signature.')
  }
}

function parsePayload(body: unknown): PaymentWebhookPayload {
  if (!body || typeof body !== 'object') throw badRequest('Invalid webhook payload.')
  const raw = body as Record<string, unknown>
  const eventId = String(raw.eventId ?? raw.event_id ?? raw.id ?? '').trim()
  const eventType = String(raw.eventType ?? raw.event_type ?? raw.type ?? '').trim()
  if (!eventId) throw badRequest('eventId is required.')
  if (!eventType) throw badRequest('eventType is required.')

  const allowed = new Set([
    'deposit.confirmed',
    'deposit.failed',
    'withdrawal.paid',
    'withdrawal.failed',
  ])
  if (!allowed.has(eventType)) {
    throw badRequest(`Unsupported eventType: ${eventType}`)
  }

  return {
    eventId,
    eventType: eventType as PaymentWebhookPayload['eventType'],
    reference: raw.reference ? String(raw.reference) : undefined,
    orderId: raw.orderId ? String(raw.orderId) : raw.order_id ? String(raw.order_id) : undefined,
    amount: raw.amount != null ? String(raw.amount) : undefined,
    currency: raw.currency ? String(raw.currency) : undefined,
    txHash: raw.txHash ? String(raw.txHash) : raw.tx_hash ? String(raw.tx_hash) : undefined,
    providerTxId: raw.providerTxId
      ? String(raw.providerTxId)
      : raw.payment_id
        ? String(raw.payment_id)
        : undefined,
    occurredAt: raw.occurredAt
      ? String(raw.occurredAt)
      : raw.occurred_at
        ? String(raw.occurred_at)
        : undefined,
    meta: typeof raw.meta === 'object' && raw.meta ? (raw.meta as Record<string, unknown>) : undefined,
  }
}

function assertTimestampSkew(occurredAt: string | undefined) {
  const maxSkew = env.PAYMENT_WEBHOOK_MAX_SKEW_SECONDS
  if (!maxSkew || !occurredAt) return
  const ts = Date.parse(occurredAt)
  if (Number.isNaN(ts)) throw badRequest('Invalid occurredAt timestamp.')
  const skew = Math.abs(Date.now() - ts) / 1000
  if (skew > maxSkew) {
    throw badRequest(`Webhook timestamp skew ${Math.round(skew)}s exceeds ${maxSkew}s.`)
  }
}

export const paymentWebhookService = {
  async ingest(input: {
    rawBody: string
    body: unknown
    signatureHeader?: string
    nowpaymentsSig?: string
    ip?: string | null
    userAgent?: string | null
  }) {
    verifyPaymentWebhookSignature({
      rawBody: input.rawBody,
      signatureHeader: input.signatureHeader,
      nowpaymentsSig: input.nowpaymentsSig,
    })

    const payload = parsePayload(input.body)
    assertTimestampSkew(payload.occurredAt)

    const provider = env.PAYMENT_PROVIDER

    // Duplicate protection — unique (provider, eventId)
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId: payload.eventId } },
    })
    if (existing) {
      return {
        duplicate: true as const,
        event: {
          id: existing.id,
          status: existing.status,
          eventId: existing.eventId,
          eventType: existing.eventType,
          depositId: existing.depositId,
          withdrawalId: existing.withdrawalId,
        },
      }
    }

    let eventRow
    try {
      eventRow = await prisma.paymentWebhookEvent.create({
        data: {
          provider,
          eventId: payload.eventId,
          eventType: payload.eventType,
          signature: normalizeSignatureHeader(input.signatureHeader) || null,
          payload: input.body as Prisma.InputJsonValue,
          status: 'RECEIVED',
        },
      })
    } catch (error) {
      // Race on unique constraint → treat as duplicate
      const again = await prisma.paymentWebhookEvent.findUnique({
        where: { provider_eventId: { provider, eventId: payload.eventId } },
      })
      if (again) {
        return {
          duplicate: true as const,
          event: {
            id: again.id,
            status: again.status,
            eventId: again.eventId,
            eventType: again.eventType,
            depositId: again.depositId,
            withdrawalId: again.withdrawalId,
          },
        }
      }
      throw error
    }

    try {
      const result = await this.processEvent(eventRow.id, payload, {
        ip: input.ip,
        userAgent: input.userAgent,
      })
      return { duplicate: false as const, ...result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed'
      await prisma.paymentWebhookEvent.update({
        where: { id: eventRow.id },
        data: {
          status: 'FAILED',
          errorMessage: message.slice(0, 1000),
          processedAt: new Date(),
        },
      })
      logger.error({ error, eventId: payload.eventId }, 'Payment webhook failed')
      await opsAlertService.notify({
        event: 'PAYMENT_WEBHOOK_FAILED',
        title: 'Payment webhook failed',
        action: message,
        reference: payload.eventId,
        ip: input.ip,
        adminPath: `/admin/deposits`,
        details: {
          EventType: payload.eventType,
          Reference: payload.reference ?? '—',
        },
      })
      throw error
    }
  },

  async processEvent(
    webhookEventId: string,
    payload: PaymentWebhookPayload,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    if (payload.eventType === 'deposit.confirmed' || payload.eventType === 'deposit.failed') {
      const deposit = await this.resolveDeposit(payload)
      if (!deposit) {
        await prisma.paymentWebhookEvent.update({
          where: { id: webhookEventId },
          data: {
            status: 'IGNORED',
            errorMessage: 'Deposit not found for reference/orderId/txHash',
            processedAt: new Date(),
          },
        })
        return { status: 'ignored' as const, reason: 'deposit_not_found' }
      }

      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { depositId: deposit.id },
      })

      if (payload.eventType === 'deposit.failed') {
        if (['PENDING', 'UNDER_REVIEW'].includes(deposit.status)) {
          await depositService.markFailedFromProvider(deposit.id, {
            eventId: payload.eventId,
            context,
          })
        }
        await prisma.paymentWebhookEvent.update({
          where: { id: webhookEventId },
          data: { status: 'PROCESSED', processedAt: new Date() },
        })
        return { status: 'processed' as const, depositId: deposit.id, action: 'rejected' }
      }

      // deposit.confirmed
      if (payload.txHash && !deposit.txHash) {
        try {
          await prisma.deposit.update({
            where: { id: deposit.id },
            data: { txHash: payload.txHash.slice(0, 120) },
          })
        } catch {
          // Unique txHash conflict — ignore; confirmation still proceeds by reference.
        }
      }

      if (deposit.status === 'APPROVED') {
        await prisma.paymentWebhookEvent.update({
          where: { id: webhookEventId },
          data: { status: 'PROCESSED', processedAt: new Date() },
        })
        return { status: 'processed' as const, depositId: deposit.id, action: 'already_approved' }
      }

      if (env.PAYMENT_AUTO_CONFIRM_DEPOSITS) {
        const credited = await depositService.confirmFromProvider(deposit.id, {
          amount: payload.amount,
          eventId: payload.eventId,
          txHash: payload.txHash,
          context,
        })
        await prisma.paymentWebhookEvent.update({
          where: { id: webhookEventId },
          data: { status: 'PROCESSED', processedAt: new Date() },
        })
        return {
          status: 'processed' as const,
          depositId: deposit.id,
          action: 'auto_confirmed',
          creditedAmount: credited,
        }
      }

      // Queue for admin approval — mark UNDER_REVIEW
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: {
          status: 'UNDER_REVIEW',
          internalNotes: `Provider confirmed ${payload.eventId}${payload.amount ? ` amount=${payload.amount}` : ''}`,
        },
      })
      await prisma.financeReview.create({
        data: {
          depositId: deposit.id,
          decision: 'PROVIDER_CONFIRM',
          reason: 'Awaiting admin approval after provider confirmation',
          metadata: { eventId: payload.eventId, amount: payload.amount ?? null },
        },
      })
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return { status: 'processed' as const, depositId: deposit.id, action: 'queued_for_admin' }
    }

    // Withdrawal events
    const withdrawal = await this.resolveWithdrawal(payload)
    if (!withdrawal) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: 'IGNORED',
          errorMessage: 'Withdrawal not found for reference/orderId',
          processedAt: new Date(),
        },
      })
      return { status: 'ignored' as const, reason: 'withdrawal_not_found' }
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEventId },
      data: { withdrawalId: withdrawal.id },
    })

    if (payload.eventType === 'withdrawal.failed') {
      if (['APPROVED', 'PROCESSING', 'PENDING', 'UNDER_REVIEW'].includes(withdrawal.status)) {
        await withdrawalService.markFailedFromProvider(withdrawal.id, {
          eventId: payload.eventId,
          context,
        })
      }
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
      return { status: 'processed' as const, withdrawalId: withdrawal.id, action: 'rejected' }
    }

    // withdrawal.paid — requires prior admin APPROVE (or allow PENDING→PAID via FORCE path in service)
    await withdrawalService.confirmPaidFromProvider(withdrawal.id, {
      eventId: payload.eventId,
      transactionRef: payload.providerTxId ?? payload.txHash,
      context,
    })
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'PROCESSED', processedAt: new Date() },
    })
    return { status: 'processed' as const, withdrawalId: withdrawal.id, action: 'paid' }
  },

  async resolveDeposit(payload: PaymentWebhookPayload) {
    const ref = payload.reference ?? payload.orderId
    if (ref) {
      const uuidLike =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref)
      const byRef = await prisma.deposit.findFirst({
        where: uuidLike ? { OR: [{ reference: ref }, { id: ref }] } : { reference: ref },
      })
      if (byRef) return byRef
    }
    if (payload.txHash) {
      return prisma.deposit.findUnique({ where: { txHash: payload.txHash } })
    }
    return null
  },

  async resolveWithdrawal(payload: PaymentWebhookPayload) {
    const ref = payload.reference ?? payload.orderId
    if (!ref) return null
    const uuidLike =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref)
    return prisma.withdrawal.findFirst({
      where: uuidLike ? { OR: [{ reference: ref }, { id: ref }] } : { reference: ref },
    })
  },

  async list(query: { cursor?: string; limit?: number; status?: string }) {
    const limit = Math.min(query.limit ?? 50, 100)
    const items = await prisma.paymentWebhookEvent.findMany({
      where: query.status
        ? { status: query.status as 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED' | 'DUPLICATE' }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })
    return {
      items: items.map((e) => ({
        id: e.id,
        provider: e.provider,
        eventId: e.eventId,
        eventType: e.eventType,
        status: e.status,
        depositId: e.depositId,
        withdrawalId: e.withdrawalId,
        errorMessage: e.errorMessage,
        processedAt: e.processedAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor: items.length === limit ? items[items.length - 1]?.id ?? null : null,
    }
  },
}