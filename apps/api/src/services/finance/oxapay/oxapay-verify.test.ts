import { describe, expect, it } from 'vitest'
import type { Deposit } from '@prisma/client'
import { Prisma } from '@prisma/client'

import { verifyOxapayPaymentAgainstDeposit } from './oxapay-webhook.service.js'
import type { OxapayPaymentInfo } from './oxapay.types.js'

function deposit(input: {
  amount: string
  reference: string
  userReference?: string
  submissionDetails?: Prisma.InputJsonValue
}): Deposit {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    reference: input.reference,
    userId: '22222222-2222-4222-8222-222222222222',
    walletId: '33333333-3333-4333-8333-333333333333',
    paymentMethodId: '44444444-4444-4444-8444-444444444444',
    transactionId: null,
    amount: new Prisma.Decimal(input.amount),
    amountInr: null,
    fee: new Prisma.Decimal(0),
    creditedAmount: null,
    currency: 'USD',
    lockDays: 10,
    fundsUnlockAt: null,
    status: 'PENDING',
    userReference: input.userReference ?? 'track-1',
    txHash: null,
    notes: null,
    submissionDetails: (input.submissionDetails ?? {
      gateway: 'oxapay',
      oxapayTrackId: 'track-1',
      expectedNetwork: 'TRC20',
    }) as Prisma.JsonValue,
    proofKey: null,
    proofImageUrl: null,
    proofChecksum: null,
    proofUploadedAt: null,
    rejectionReason: null,
    internalNotes: null,
    idempotencyKey: 'idem-1',
    reviewedById: null,
    reviewedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function payment(partial: Partial<OxapayPaymentInfo>): OxapayPaymentInfo {
  return {
    track_id: 'track-1',
    amount: 100,
    currency: 'USD',
    status: 'paid',
    order_id: 'DEP-100',
    txs: [{ tx_hash: '0xhash', network: 'Tron Network', status: 'confirmed' }],
    ...partial,
  }
}

describe('verifyOxapayPaymentAgainstDeposit', () => {
  const base = deposit({ amount: '100', reference: 'DEP-100' })

  it('accepts matching paid USD invoice', () => {
    expect(
      verifyOxapayPaymentAgainstDeposit({
        deposit: base,
        payment: payment({}),
        trackId: 'track-1',
      }),
    ).toEqual({ ok: true })
  })

  it('rejects wrong amount', () => {
    const result = verifyOxapayPaymentAgainstDeposit({
      deposit: base,
      payment: payment({ amount: 99 }),
      trackId: 'track-1',
    })
    expect(result).toEqual({ ok: false, reason: 'amount_mismatch' })
  })

  it('rejects wrong currency', () => {
    const result = verifyOxapayPaymentAgainstDeposit({
      deposit: base,
      payment: payment({ currency: 'EUR' }),
      trackId: 'track-1',
    })
    expect(result).toEqual({ ok: false, reason: 'currency_mismatch' })
  })

  it('rejects wrong track_id', () => {
    const result = verifyOxapayPaymentAgainstDeposit({
      deposit: base,
      payment: payment({ track_id: 'other' }),
      trackId: 'track-1',
    })
    expect(result).toEqual({ ok: false, reason: 'track_id_mismatch' })
  })

  it('rejects wrong order_id', () => {
    const result = verifyOxapayPaymentAgainstDeposit({
      deposit: base,
      payment: payment({ order_id: 'DEP-OTHER' }),
      trackId: 'track-1',
    })
    expect(result).toEqual({ ok: false, reason: 'order_id_mismatch' })
  })

  it('rejects wrong network for method-bound rails', () => {
    const result = verifyOxapayPaymentAgainstDeposit({
      deposit: base,
      payment: payment({
        txs: [{ tx_hash: '0xhash', network: 'BNB Smart Chain', status: 'confirmed' }],
      }),
      trackId: 'track-1',
    })
    expect(result).toEqual({ ok: false, reason: 'network_mismatch' })
  })

  it('rejects non-paid payment info status', () => {
    const result = verifyOxapayPaymentAgainstDeposit({
      deposit: base,
      payment: payment({ status: 'Paying' }),
      trackId: 'track-1',
    })
    expect(result).toEqual({ ok: false, reason: 'payment_status_paying' })
  })

  it('accepts $1 invoice amount', () => {
    const one = deposit({
      amount: '1',
      reference: 'DEP-1',
      submissionDetails: { gateway: 'oxapay', oxapayTrackId: 't1' },
    })
    expect(
      verifyOxapayPaymentAgainstDeposit({
        deposit: one,
        payment: payment({
          track_id: 't1',
          order_id: 'DEP-1',
          amount: 1,
          txs: undefined,
        }),
        trackId: 't1',
      }),
    ).toEqual({ ok: true })
  })
})
