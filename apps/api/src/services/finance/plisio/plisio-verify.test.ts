import { describe, expect, it } from 'vitest'
import type { Deposit } from '@prisma/client'
import { Prisma } from '@prisma/client'

import { verifyPlisioOperationAgainstDeposit } from './plisio-webhook.service.js'
import type { PlisioOperation, PlisioWebhookPayload } from './plisio.types.js'

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
    userReference: input.userReference ?? 'txn-1',
    txHash: null,
    notes: null,
    submissionDetails: (input.submissionDetails ?? {
      gateway: 'plisio',
      plisioTxnId: 'txn-1',
      plisioOrderId: input.reference,
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

describe('verifyPlisioOperationAgainstDeposit', () => {
  const base = deposit({ amount: '1.10', reference: 'DEP-7E8B72544F' })
  const webhook: PlisioWebhookPayload = {
    txn_id: 'txn-1',
    status: 'completed',
    order_number: 'DEP-7E8B72544F',
    source_currency: 'USD',
    source_amount: '1.10',
    currency: 'USDT_BSC',
  }

  it('accepts completed invoice when GET /operations omits order_number (non-white-label)', () => {
    const operation: PlisioOperation = {
      id: 'txn-1',
      status: 'completed',
      psys_cid: 'USDT_BSC',
      currency: 'USDT_BSC',
    }
    expect(
      verifyPlisioOperationAgainstDeposit({
        deposit: base,
        operation,
        txnId: 'txn-1',
        webhook,
      }),
    ).toEqual({ ok: true })
  })

  it('still rejects a different order number when Plisio does send one', () => {
    const operation: PlisioOperation = {
      id: 'txn-1',
      status: 'completed',
      params: { order_number: 'DEP-OTHER', source_amount: '1.10', source_currency: 'USD' },
    }
    expect(
      verifyPlisioOperationAgainstDeposit({
        deposit: base,
        operation,
        txnId: 'txn-1',
        webhook,
      }),
    ).toEqual({ ok: false, reason: 'order_number_mismatch' })
  })
})
