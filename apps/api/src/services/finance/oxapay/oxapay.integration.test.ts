import { createHmac, randomUUID } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

import { createApp } from '../../../app.js'
import { env } from '../../../config/env.js'
import { moneyString } from '../../../utils/money.js'
import { oxapayHmacSha512Hex } from './oxapay.hmac.js'

const app = createApp()
const MERCHANT_KEY = 'test-oxapay-merchant-key-for-vitest!!'

vi.mock('./oxapay.client.js', async () => {
  const actual = await vi.importActual<typeof import('./oxapay.client.js')>('./oxapay.client.js')
  return {
    ...actual,
    oxapayClient: {
      isConfigured: () => true,
      createInvoice: vi.fn(),
      getPayment: vi.fn(),
    },
    isOxapayConfigured: () => true,
  }
})

async function bootstrapCryptoInvestor() {
  const email = `oxa_${randomUUID().slice(0, 8)}@example.com`
  const password = 'SecurePass1!'
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Oxa',
    lastName: 'User',
    acceptTerms: true,
    acceptRisk: true,
  })
  const { prisma } = await import('../../../database/prisma.js')
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    },
  })

  const { ledgerService } = await import('../ledger.service.js')
  await ledgerService.ensureWalletsForUser(user.id)

  for (const code of ['SYS:CLEARING', 'SYS:PAYOUT', 'SYS:FEES', 'SYS:SUSPENSE']) {
    await prisma.ledgerAccount.upsert({
      where: { code },
      create: { code, name: code, accountType: 'ASSET', isSystem: true },
      update: {},
    })
  }

  const method = await prisma.paymentMethod.create({
    data: {
      name: `USDT TRC20 ${randomUUID().slice(0, 6)}`,
      type: 'USDT_TRC20',
      instructions: 'OxaPay test',
      minAmount: moneyString(1),
      maxAmount: moneyString(250000),
      feePct: moneyString(0),
      isActive: true,
    },
  })

  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)

  return { agent, userId: user.id, methodId: method.id, prisma, email }
}

describe('OxaPay gateway deposits', () => {
  const prevKey = env.OXAPAY_MERCHANT_API_KEY
  const prevAuto = env.PAYMENT_AUTO_CONFIRM_DEPOSITS
  const prevSandbox = env.OXAPAY_SANDBOX

  beforeEach(async () => {
    env.OXAPAY_MERCHANT_API_KEY = MERCHANT_KEY
    // Production OxaPay posture: verified paid webhooks auto-credit.
    env.PAYMENT_AUTO_CONFIRM_DEPOSITS = true
    env.OXAPAY_SANDBOX = true
    const { oxapayClient } = await import('./oxapay.client.js')
    vi.mocked(oxapayClient.createInvoice).mockReset()
    vi.mocked(oxapayClient.getPayment).mockReset()
  })

  afterEach(() => {
    env.OXAPAY_MERCHANT_API_KEY = prevKey
    env.PAYMENT_AUTO_CONFIRM_DEPOSITS = prevAuto
    env.OXAPAY_SANDBOX = prevSandbox
  })

  it('creates invoice with order_id = deposit.reference and returns payment_url', async () => {
    const { agent, methodId, prisma } = await bootstrapCryptoInvestor()
    const { oxapayClient } = await import('./oxapay.client.js')
    const trackId = `900-${randomUUID().slice(0, 8)}`
    vi.mocked(oxapayClient.createInvoice).mockResolvedValue({
      track_id: trackId,
      payment_url: `https://pay.oxapay.com/invoice/${trackId}`,
      expired_at: Math.floor(Date.now() / 1000) + 3600,
      date: Math.floor(Date.now() / 1000),
    })

    const res = await agent.post('/api/v1/deposits/oxapay').send({
      amount: '1.00',
      methodId,
      idempotencyKey: `oxa-${randomUUID()}`,
    })
    expect(res.status).toBe(201)
    expect(res.body.data.paymentUrl).toBe(`https://pay.oxapay.com/invoice/${trackId}`)
    expect(res.body.data.oxapayTrackId).toBe(trackId)
    expect(res.body.data.status).toBe('PENDING')
    expect(res.body.data.gateway).toBe('oxapay')

    const call = vi.mocked(oxapayClient.createInvoice).mock.calls[0]?.[0]
    expect(call?.amount).toBe(1)
    expect(call?.currency).toBe('USD')
    expect(call?.order_id).toBe(res.body.data.reference)
    expect(call?.sandbox).toBe(true)

    const row = await prisma.deposit.findUniqueOrThrow({ where: { id: res.body.data.id } })
    expect(row.status).toBe('PENDING')
    const details = row.submissionDetails as Record<string, string>
    expect(details.oxapayTrackId).toBe(trackId)
    expect(details.oxapayOrderId).toBe(row.reference)
  })

  it('cancels internal deposit when invoice creation fails', async () => {
    const { agent, methodId, prisma } = await bootstrapCryptoInvestor()
    const { oxapayClient } = await import('./oxapay.client.js')
    vi.mocked(oxapayClient.createInvoice).mockRejectedValue(new Error('OxaPay down'))

    const res = await agent.post('/api/v1/deposits/oxapay').send({
      amount: '1.50',
      methodId,
      idempotencyKey: `oxa-${randomUUID()}`,
    })
    expect(res.status).toBeGreaterThanOrEqual(400)

    const pending = await prisma.deposit.count({
      where: { status: 'PENDING', paymentMethodId: methodId },
    })
    expect(pending).toBe(0)
  })

  it('rejects invalid HMAC webhooks', async () => {
    const body = JSON.stringify({
      track_id: randomUUID(),
      status: 'Paid',
      order_id: 'DEP-X',
      type: 'invoice',
    })
    const res = await request(app)
      .post('/api/v1/webhooks/oxapay')
      .set('Content-Type', 'application/json')
      .set('HMAC', 'deadbeef')
      .send(body)
    expect(res.status).toBe(401)
  })

  it('accepts valid HMAC and does not credit on waiting/paying/underpaid', async () => {
    const { userId, methodId, prisma } = await bootstrapCryptoInvestor()
    const { depositService } = await import('../deposit.service.js')
    const { oxapayWebhookService } = await import('./oxapay-webhook.service.js')
    const trackId = `track-w-${randomUUID().slice(0, 8)}`

    const deposit = await depositService.create(
      userId,
      {
        amount: '100.00',
        methodId,
        idempotencyKey: `oxa-${randomUUID()}`,
        submissionDetails: {
          gateway: 'oxapay',
          oxapayTrackId: trackId,
          expectedNetwork: 'TRC20',
        },
      },
      {},
    )
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { userReference: trackId },
    })

    for (const status of ['Waiting', 'Paying', 'Underpaid'] as const) {
      const payload = {
        track_id: trackId,
        status,
        type: 'invoice',
        order_id: deposit.reference,
        amount: 100,
        currency: 'USDT',
      }
      const raw = JSON.stringify(payload)
      const result = await oxapayWebhookService.ingest({
        rawBody: raw,
        body: payload,
        hmacHeader: oxapayHmacSha512Hex(raw, MERCHANT_KEY),
        context: {},
      })
      expect(result.duplicate).toBe(false)
      expect(['status_updated', 'rejected'].includes((result as { action?: string }).action ?? '')).toBe(
        true,
      )
    }

    const after = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(after.status).not.toBe('APPROVED')
    expect(after.creditedAmount).toBeNull()
  })

  it('paid webhook with autoConfirm verifies and credits once + 10-day lock; duplicates do not re-credit', async () => {
    const { userId, methodId, prisma } = await bootstrapCryptoInvestor()
    const { depositService } = await import('../deposit.service.js')
    const { oxapayWebhookService } = await import('./oxapay-webhook.service.js')
    const { oxapayClient } = await import('./oxapay.client.js')
    const trackId = `track-paid-${randomUUID().slice(0, 8)}`
    const txHash = `0x${randomUUID().replace(/-/g, '')}`

    const walletBefore = await prisma.wallet.findFirstOrThrow({
      where: { userId, kind: 'INVESTMENT' },
    })

    const deposit = await depositService.create(
      userId,
      {
        amount: '100.00',
        methodId,
        idempotencyKey: `oxa-${randomUUID()}`,
        submissionDetails: {
          gateway: 'oxapay',
          oxapayTrackId: trackId,
          expectedNetwork: 'TRC20',
        },
      },
      {},
    )
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { userReference: trackId },
    })

    // Browser return alone — still PENDING, no credit
    expect(deposit.status).toBe('PENDING')
    expect(deposit.creditedAmount).toBeNull()

    vi.mocked(oxapayClient.getPayment).mockResolvedValue({
      track_id: trackId,
      amount: 100,
      currency: 'USD',
      status: 'Paid',
      order_id: deposit.reference,
      txs: [{ tx_hash: txHash, network: 'Tron Network', status: 'confirmed' }],
    })

    const payload = {
      track_id: trackId,
      status: 'Paid',
      type: 'invoice',
      order_id: deposit.reference,
      amount: 100,
      currency: 'USDT',
      txs: [{ tx_hash: txHash, network: 'Tron Network', status: 'confirmed' }],
    }
    const raw = JSON.stringify(payload)
    const hmac = oxapayHmacSha512Hex(raw, MERCHANT_KEY)

    const first = await oxapayWebhookService.ingest({
      rawBody: raw,
      body: payload,
      hmacHeader: hmac,
      context: {},
    })
    expect(first.duplicate).toBe(false)
    expect((first as { action?: string }).action).toBe('auto_confirmed')

    const approved = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(approved.status).toBe('APPROVED')
    expect(Number(approved.creditedAmount)).toBe(100)
    expect(approved.fundsUnlockAt).toBeTruthy()
    const unlockMs = approved.fundsUnlockAt!.getTime() - approved.reviewedAt!.getTime()
    expect(unlockMs).toBeGreaterThanOrEqual(10 * 24 * 3600_000 - 5_000)
    expect(unlockMs).toBeLessThanOrEqual(10 * 24 * 3600_000 + 5_000)

    const credits = await prisma.ledgerEntry.count({
      where: { idempotencyKey: `deposit:${deposit.id}:approve:available` },
    })
    expect(credits).toBe(1)

    const walletAfter = await prisma.wallet.findFirstOrThrow({
      where: { userId, kind: 'INVESTMENT' },
    })
    expect(Number(walletAfter.availableBalance)).toBe(Number(walletBefore.availableBalance) + 100)

    expect(approved.transactionId).toBeTruthy()
    expect(
      await prisma.transaction.count({ where: { userId, id: approved.transactionId! } }),
    ).toBe(1)

    // Duplicate paid webhook — no second credit
    const second = await oxapayWebhookService.ingest({
      rawBody: raw,
      body: payload,
      hmacHeader: hmac,
      context: {},
    })
    expect(second.duplicate).toBe(true)
    expect(
      await prisma.ledgerEntry.count({
        where: { idempotencyKey: `deposit:${deposit.id}:approve:available` },
      }),
    ).toBe(1)
    const walletAfterDup = await prisma.wallet.findFirstOrThrow({
      where: { userId, kind: 'INVESTMENT' },
    })
    expect(walletAfterDup.availableBalance.toString()).toBe(walletAfter.availableBalance.toString())
  })

  it('does not credit when order_id does not match deposit reference', async () => {
    const { userId, methodId, prisma } = await bootstrapCryptoInvestor()
    const { depositService } = await import('../deposit.service.js')
    const { oxapayWebhookService } = await import('./oxapay-webhook.service.js')
    const { oxapayClient } = await import('./oxapay.client.js')
    const trackId = `track-ord-${randomUUID().slice(0, 8)}`

    const deposit = await depositService.create(
      userId,
      {
        amount: '50.00',
        methodId,
        idempotencyKey: `oxa-${randomUUID()}`,
        submissionDetails: { gateway: 'oxapay', oxapayTrackId: trackId },
      },
      {},
    )
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { userReference: trackId },
    })

    vi.mocked(oxapayClient.getPayment).mockResolvedValue({
      track_id: trackId,
      amount: 50,
      currency: 'USD',
      status: 'Paid',
      order_id: 'DEP-WRONG-ORDER',
      txs: [],
    })

    const payload = {
      track_id: trackId,
      status: 'Paid',
      type: 'invoice',
      order_id: deposit.reference,
    }
    const raw = JSON.stringify(payload)
    const result = await oxapayWebhookService.ingest({
      rawBody: raw,
      body: payload,
      hmacHeader: oxapayHmacSha512Hex(raw, MERCHANT_KEY),
      context: {},
    })
    expect((result as { action?: string }).action).toBe('verification_failed')
    const after = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(after.status).not.toBe('APPROVED')
    expect(after.creditedAmount).toBeNull()
  })

  it('does not credit wrong amount / wrong currency / expired', async () => {
    const { userId, methodId, prisma } = await bootstrapCryptoInvestor()
    const { depositService } = await import('../deposit.service.js')
    const { oxapayWebhookService } = await import('./oxapay-webhook.service.js')
    const { oxapayClient } = await import('./oxapay.client.js')

    async function seed(prefix: string) {
      const trackId = `${prefix}-${randomUUID().slice(0, 8)}`
      const deposit = await depositService.create(
        userId,
        {
          amount: '100.00',
          methodId,
          idempotencyKey: `oxa-${randomUUID()}`,
          submissionDetails: {
            gateway: 'oxapay',
            oxapayTrackId: trackId,
            expectedNetwork: 'TRC20',
          },
        },
        {},
      )
      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { userReference: trackId },
      })
      return { deposit, trackId }
    }

    const { deposit: amountDeposit, trackId: trackAmt } = await seed('track-amt')
    vi.mocked(oxapayClient.getPayment).mockResolvedValue({
      track_id: trackAmt,
      amount: 99,
      currency: 'USD',
      status: 'Paid',
      order_id: amountDeposit.reference,
      txs: [{ tx_hash: `0x${randomUUID().replace(/-/g, '')}`, network: 'Tron Network', status: 'confirmed' }],
    })
    const paidPayload = {
      track_id: trackAmt,
      status: 'Paid',
      type: 'invoice',
      order_id: amountDeposit.reference,
    }
    const rawPaid = JSON.stringify(paidPayload)
    const badAmount = await oxapayWebhookService.ingest({
      rawBody: rawPaid,
      body: paidPayload,
      hmacHeader: oxapayHmacSha512Hex(rawPaid, MERCHANT_KEY),
      context: {},
    })
    expect((badAmount as { action?: string }).action).toBe('verification_failed')
    const afterAmount = await prisma.deposit.findUniqueOrThrow({ where: { id: amountDeposit.id } })
    expect(afterAmount.status).toBe('UNDER_REVIEW')
    expect(afterAmount.creditedAmount).toBeNull()

    const { deposit: currencyDeposit, trackId: trackCur } = await seed('track-cur')
    vi.mocked(oxapayClient.getPayment).mockResolvedValue({
      track_id: trackCur,
      amount: 100,
      currency: 'EUR',
      status: 'Paid',
      order_id: currencyDeposit.reference,
      txs: [{ tx_hash: `0x${randomUUID().replace(/-/g, '')}`, network: 'Tron Network', status: 'confirmed' }],
    })
    const currencyPayload = {
      track_id: trackCur,
      status: 'Paid',
      type: 'invoice',
      order_id: currencyDeposit.reference,
    }
    const rawCurrency = JSON.stringify(currencyPayload)
    const badCurrency = await oxapayWebhookService.ingest({
      rawBody: rawCurrency,
      body: currencyPayload,
      hmacHeader: oxapayHmacSha512Hex(rawCurrency, MERCHANT_KEY),
      context: {},
    })
    expect((badCurrency as { action?: string }).action).toBe('verification_failed')

    const { deposit: expiredDeposit, trackId: trackExp } = await seed('track-exp')
    const expiredPayload = {
      track_id: trackExp,
      status: 'Expired',
      type: 'invoice',
      order_id: expiredDeposit.reference,
    }
    const rawExpired = JSON.stringify(expiredPayload)
    await oxapayWebhookService.ingest({
      rawBody: rawExpired,
      body: expiredPayload,
      hmacHeader: oxapayHmacSha512Hex(rawExpired, MERCHANT_KEY),
      context: {},
    })
    const expired = await prisma.deposit.findUniqueOrThrow({ where: { id: expiredDeposit.id } })
    expect(expired.status).toBe('REJECTED')
  })

  it('HTTP paid webhook returns plain ok and auto-credits when verified (browser return alone does not)', async () => {
    const { userId, methodId, prisma } = await bootstrapCryptoInvestor()
    const { depositService } = await import('../deposit.service.js')
    const { oxapayClient } = await import('./oxapay.client.js')
    const trackId = `track-http-${randomUUID().slice(0, 8)}`

    const deposit = await depositService.create(
      userId,
      {
        amount: '1.00',
        methodId,
        idempotencyKey: `oxa-${randomUUID()}`,
        submissionDetails: {
          gateway: 'oxapay',
          oxapayTrackId: trackId,
        },
      },
      {},
    )
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { userReference: trackId },
    })

    // Browser return alone — still PENDING, no credit
    const still = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(still.status).toBe('PENDING')
    expect(still.creditedAmount).toBeNull()

    vi.mocked(oxapayClient.getPayment).mockResolvedValue({
      track_id: trackId,
      amount: 1,
      currency: 'USD',
      status: 'paid',
      order_id: deposit.reference,
      txs: [],
    })

    const payload = {
      track_id: trackId,
      status: 'Paid',
      type: 'invoice',
      order_id: deposit.reference,
    }
    const raw = JSON.stringify(payload)
    const res = await request(app)
      .post('/api/v1/webhooks/oxapay')
      .set('Content-Type', 'application/json')
      .set('HMAC', createHmac('sha512', MERCHANT_KEY).update(raw, 'utf8').digest('hex'))
      .send(raw)
    expect(res.status).toBe(200)
    expect(res.text).toBe('ok')

    const approved = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(approved.status).toBe('APPROVED')
    expect(approved.creditedAmount).not.toBeNull()
    expect(
      await prisma.ledgerEntry.count({
        where: { idempotencyKey: `deposit:${deposit.id}:approve:available` },
      }),
    ).toBe(1)
  })

  it('manual (non-OxaPay) deposits still require Admin approval even with autoConfirm=true', async () => {
    const { userId, methodId, prisma } = await bootstrapCryptoInvestor()
    const { depositService } = await import('../deposit.service.js')

    const deposit = await depositService.create(
      userId,
      {
        amount: '25.00',
        methodId,
        idempotencyKey: `manual-${randomUUID()}`,
        submissionDetails: { network: 'TRC20', coin: 'USDT' },
      },
      {},
    )
    expect(deposit.status).toBe('PENDING')
    expect(deposit.creditedAmount).toBeNull()

    const before = await prisma.wallet.findFirstOrThrow({
      where: { userId, kind: 'INVESTMENT' },
    })

    // No webhook path for manual — still uncredited until Admin
    const row = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } })
    expect(row.status).toBe('PENDING')
    expect(row.creditedAmount).toBeNull()

    const approved = await depositService.review(
      userId,
      deposit.id,
      { decision: 'APPROVE', reason: 'Manual proof verified' },
      {},
    )
    expect(approved.status).toBe('APPROVED')

    const after = await prisma.wallet.findFirstOrThrow({
      where: { userId, kind: 'INVESTMENT' },
    })
    expect(Number(after.availableBalance)).toBe(Number(before.availableBalance) + 25)
  })
})
