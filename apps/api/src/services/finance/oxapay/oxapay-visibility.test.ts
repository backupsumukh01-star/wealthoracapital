import { describe, expect, it } from 'vitest'

import {
  isEligibleForOxapayCleanup,
  isOxapayGateway,
  isOxapayOpenAttempt,
  isOxapayOrdinaryUnpaidAttempt,
  isVisibleInAdminOperationalQueue,
  oxapayAdminOperationalExcludeWhere,
  oxapayCleanupDueWhere,
  oxapayHumanAdminAttentionWhere,
  oxapayRequiresHumanAdminAttention,
  oxapayUserVisibilityEndsAt,
  shouldHideOxapayFromUserView,
  OXAPAY_PENDING_GRACE_MS,
  OXAPAY_INVOICE_LIFETIME_MS,
} from './oxapay-visibility.js'

describe('oxapay-visibility', () => {
  it('detects oxapay gateway from submissionDetails', () => {
    expect(isOxapayGateway({ gateway: 'oxapay' })).toBe(true)
    expect(isOxapayGateway({ gateway: 'manual' })).toBe(false)
    expect(isOxapayGateway(null)).toBe(false)
  })

  it('computes visibility end as expiresAt + 30m', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const expiresAt = new Date('2026-01-01T01:00:00.000Z')
    const ends = oxapayUserVisibilityEndsAt(expiresAt, createdAt)
    expect(ends.toISOString()).toBe('2026-01-01T01:30:00.000Z')
  })

  it('falls back to createdAt + 60m + 30m when expiresAt missing', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const ends = oxapayUserVisibilityEndsAt(null, createdAt)
    expect(ends.getTime() - createdAt.getTime()).toBe(
      OXAPAY_INVOICE_LIFETIME_MS + OXAPAY_PENDING_GRACE_MS,
    )
  })

  it('hides unpaid oxapay after grace, keeps APPROVED visible', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const expiresAt = new Date('2026-01-01T01:00:00.000Z')
    const details = { gateway: 'oxapay' }
    const nowInside = new Date('2026-01-01T01:20:00.000Z')
    const nowAfter = new Date('2026-01-01T01:31:00.000Z')

    expect(
      shouldHideOxapayFromUserView(
        { status: 'PENDING', expiresAt, createdAt, submissionDetails: details },
        nowInside,
      ),
    ).toBe(false)

    expect(
      shouldHideOxapayFromUserView(
        { status: 'PENDING', expiresAt, createdAt, submissionDetails: details },
        nowAfter,
      ),
    ).toBe(true)

    expect(
      shouldHideOxapayFromUserView(
        { status: 'APPROVED', expiresAt, createdAt, submissionDetails: details },
        nowAfter,
      ),
    ).toBe(false)
  })

  it('builds cleanup due filter with grace cutoff and human-attention exclusion', () => {
    const where = oxapayCleanupDueWhere(new Date('2026-01-01T02:00:00.000Z'))
    expect(where.status).toEqual({ in: ['PENDING', 'UNDER_REVIEW'] })
    expect(where.OR).toBeTruthy()
    const and = where.AND as Array<Record<string, unknown>>
    expect(and).toHaveLength(2)
    expect(and[1]).toEqual({ NOT: oxapayHumanAdminAttentionWhere() })
  })
})

describe('oxapay cleanup due selection (narrow — ordinary unpaid only)', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z')
  const expiresAt = new Date('2026-01-01T01:00:00.000Z')
  /** After expiry + 30m grace */
  const nowPastGrace = new Date('2026-01-01T01:31:00.000Z')
  /** Still inside grace */
  const nowInsideGrace = new Date('2026-01-01T01:20:00.000Z')

  const unpaidNew = { gateway: 'oxapay', oxapayStatus: 'new' }
  const unpaidWaiting = { gateway: 'oxapay', oxapayStatus: 'waiting' }
  const awaitingAdmin = {
    gateway: 'oxapay',
    oxapayStatus: 'paid',
    oxapayVerificationResult: 'ok',
    oxapayAwaitingAdminApproval: 'true',
  }
  const underpaid = { gateway: 'oxapay', oxapayStatus: 'underpaid' }
  const manualAccept = { gateway: 'oxapay', oxapayStatus: 'manual_accept' }
  const paidOpen = { gateway: 'oxapay', oxapayStatus: 'paid' }
  const verificationFail = {
    gateway: 'oxapay',
    oxapayStatus: 'paid',
    oxapayVerificationResult: 'amount_mismatch',
  }
  const verificationOk = {
    gateway: 'oxapay',
    oxapayStatus: 'paid',
    oxapayVerificationResult: 'ok',
  }

  it('CLEAN1 ordinary unpaid PENDING past grace → cleanup eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'PENDING', expiresAt, createdAt, submissionDetails: unpaidNew },
        nowPastGrace,
      ),
    ).toBe(true)
    expect(
      isEligibleForOxapayCleanup(
        { status: 'PENDING', expiresAt, createdAt, submissionDetails: unpaidNew },
        nowInsideGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN2 ordinary unpaid UNDER_REVIEW past grace (no human markers) → eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'UNDER_REVIEW', expiresAt, createdAt, submissionDetails: unpaidWaiting },
        nowPastGrace,
      ),
    ).toBe(true)
  })

  it('CLEAN3 expired unpaid OxaPay past grace → eligible', () => {
    const expiredMeta = { gateway: 'oxapay', oxapayStatus: 'expired' }
    expect(
      isEligibleForOxapayCleanup(
        { status: 'PENDING', expiresAt, createdAt, submissionDetails: expiredMeta },
        nowPastGrace,
      ),
    ).toBe(true)
  })

  it('CLEAN4 oxapayStatus=paid → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'UNDER_REVIEW', expiresAt, createdAt, submissionDetails: paidOpen },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN5 underpaid → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'UNDER_REVIEW', expiresAt, createdAt, submissionDetails: underpaid },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN6 manual_accept → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'UNDER_REVIEW', expiresAt, createdAt, submissionDetails: manualAccept },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN7 oxapayAwaitingAdminApproval=true → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'UNDER_REVIEW', expiresAt, createdAt, submissionDetails: awaitingAdmin },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN8 PROVIDER_CONFIRM / verification ok human path → NOT eligible', () => {
    // Prisma where excludes reviews.some PROVIDER_CONFIRM; row-level helper uses
    // the same human-attention fields (verification ok + paid / awaiting).
    expect(oxapayRequiresHumanAdminAttention(verificationOk)).toBe(true)
    expect(
      isEligibleForOxapayCleanup(
        { status: 'UNDER_REVIEW', expiresAt, createdAt, submissionDetails: verificationOk },
        nowPastGrace,
      ),
    ).toBe(false)
    const where = oxapayCleanupDueWhere(nowPastGrace)
    const and = where.AND as Array<{ NOT?: unknown }>
    expect(and.some((c) => c.NOT && JSON.stringify(c.NOT).includes('PROVIDER_CONFIRM'))).toBe(
      true,
    )
  })

  it('CLEAN9 verification mismatch requiring review → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'UNDER_REVIEW', expiresAt, createdAt, submissionDetails: verificationFail },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN10 APPROVED → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        {
          status: 'APPROVED',
          expiresAt,
          createdAt,
          submissionDetails: { gateway: 'oxapay', oxapayStatus: 'paid' },
        },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN11 REJECTED → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'REJECTED', expiresAt, createdAt, submissionDetails: unpaidNew },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('CLEAN12 CANCELLED → NOT eligible', () => {
    expect(
      isEligibleForOxapayCleanup(
        { status: 'CANCELLED', expiresAt, createdAt, submissionDetails: unpaidNew },
        nowPastGrace,
      ),
    ).toBe(false)
  })

  it('cleanup Where reuses identical human-attention predicate as admin exclude', () => {
    const cleanupWhere = oxapayCleanupDueWhere(nowPastGrace)
    const adminWhere = oxapayAdminOperationalExcludeWhere()
    const cleanupNot = (cleanupWhere.AND as Array<{ NOT?: unknown }>).find((c) => c.NOT)?.NOT
    const adminNotHuman = (adminWhere.NOT as { AND: Array<{ NOT?: unknown }> }).AND.find(
      (c) => c.NOT,
    )?.NOT
    expect(cleanupNot).toEqual(oxapayHumanAdminAttentionWhere())
    expect(adminNotHuman).toEqual(oxapayHumanAdminAttentionWhere())
    expect(cleanupNot).toEqual(adminNotHuman)
  })
})

describe('oxapay admin operational queue exclusion (narrow)', () => {
  const unpaidNew = { gateway: 'oxapay', oxapayStatus: 'new' }
  const unpaidWaiting = { gateway: 'oxapay', oxapayStatus: 'waiting' }
  const abandonedPaying = { gateway: 'oxapay', oxapayStatus: 'paying' }
  const invoicePending = { gateway: 'oxapay', oxapayStatus: 'invoice_pending' }

  const awaitingAdmin = {
    gateway: 'oxapay',
    oxapayStatus: 'paid',
    oxapayVerificationResult: 'ok',
    oxapayAwaitingAdminApproval: 'true',
  }
  const underpaid = { gateway: 'oxapay', oxapayStatus: 'underpaid' }
  const manualAccept = { gateway: 'oxapay', oxapayStatus: 'manual_accept' }
  const verificationFail = {
    gateway: 'oxapay',
    oxapayStatus: 'paid',
    oxapayVerificationResult: 'amount_mismatch',
  }
  const approvedMeta = { gateway: 'oxapay', oxapayStatus: 'paid', oxapayVerificationResult: 'ok' }
  const manualDeposit = { gateway: 'upi', proofNote: 'bank transfer' }

  it('TEST1 ordinary unpaid OxaPay PENDING is excluded from Admin operational queue', () => {
    expect(isOxapayOrdinaryUnpaidAttempt('PENDING', unpaidNew)).toBe(true)
    expect(isVisibleInAdminOperationalQueue('PENDING', unpaidNew)).toBe(false)
    expect(isOxapayOpenAttempt('PENDING', unpaidNew)).toBe(true)
  })

  it('TEST2 ordinary abandoned OxaPay (waiting/paying) is excluded', () => {
    expect(isVisibleInAdminOperationalQueue('PENDING', unpaidWaiting)).toBe(false)
    expect(isVisibleInAdminOperationalQueue('PENDING', abandonedPaying)).toBe(false)
    expect(isVisibleInAdminOperationalQueue('PENDING', invoicePending)).toBe(false)
  })

  it('TEST3 expired/unpaid OxaPay still PENDING without exception markers is excluded', () => {
    const expiredMeta = { gateway: 'oxapay', oxapayStatus: 'expired' }
    // Expired webhook normally marks REJECTED; if still PENDING it is ordinary unpaid noise.
    expect(oxapayRequiresHumanAdminAttention(expiredMeta)).toBe(false)
    expect(isVisibleInAdminOperationalQueue('PENDING', expiredMeta)).toBe(false)
  })

  it('TEST4 provider-confirmed OxaPay awaiting admin remains visible', () => {
    expect(oxapayRequiresHumanAdminAttention(awaitingAdmin)).toBe(true)
    expect(isOxapayOrdinaryUnpaidAttempt('UNDER_REVIEW', awaitingAdmin)).toBe(false)
    expect(isVisibleInAdminOperationalQueue('UNDER_REVIEW', awaitingAdmin)).toBe(true)
    expect(
      isVisibleInAdminOperationalQueue('UNDER_REVIEW', unpaidNew, {
        hasProviderConfirmReview: true,
      }),
    ).toBe(true)
  })

  it('TEST5 underpaid OxaPay remains visible', () => {
    expect(oxapayRequiresHumanAdminAttention(underpaid)).toBe(true)
    expect(isVisibleInAdminOperationalQueue('UNDER_REVIEW', underpaid)).toBe(true)
    expect(isOxapayOrdinaryUnpaidAttempt('UNDER_REVIEW', underpaid)).toBe(false)
  })

  it('TEST6 manual_accept remains visible', () => {
    expect(oxapayRequiresHumanAdminAttention(manualAccept)).toBe(true)
    expect(isVisibleInAdminOperationalQueue('UNDER_REVIEW', manualAccept)).toBe(true)
  })

  it('TEST6b verification-failed paid path remains visible', () => {
    expect(isVisibleInAdminOperationalQueue('UNDER_REVIEW', verificationFail)).toBe(true)
  })

  it('TEST7 approved OxaPay remains visible in approved/history (filter does not hide)', () => {
    expect(isVisibleInAdminOperationalQueue('APPROVED', approvedMeta)).toBe(true)
    expect(isOxapayOrdinaryUnpaidAttempt('APPROVED', approvedMeta)).toBe(false)
  })

  it('TEST8 existing manual deposit remains visible/functional in operational queue', () => {
    expect(isOxapayGateway(manualDeposit)).toBe(false)
    expect(isOxapayOrdinaryUnpaidAttempt('PENDING', manualDeposit)).toBe(false)
    expect(isVisibleInAdminOperationalQueue('PENDING', manualDeposit)).toBe(true)
    expect(isVisibleInAdminOperationalQueue('UNDER_REVIEW', manualDeposit)).toBe(true)
  })

  it('TEST9 non-OxaPay withdrawal/KYC-unrelated deposit statuses are unchanged by helper', () => {
    // Visibility helper only scopes OxaPay ordinary unpaid; other entities unaffected.
    expect(isOxapayOrdinaryUnpaidAttempt('PENDING', { gateway: 'bank' })).toBe(false)
    expect(isVisibleInAdminOperationalQueue('PENDING', { gateway: 'bank' })).toBe(true)
  })

  it('admin exclude Where is narrow: NOT (open OxaPay AND NOT human-attention)', () => {
    const where = oxapayAdminOperationalExcludeWhere()
    const and = (where.NOT as { AND: unknown[] }).AND
    expect(and).toHaveLength(3)
    expect(and[0]).toEqual({ status: { in: ['PENDING', 'UNDER_REVIEW'] } })
    expect(and[2]).toEqual({ NOT: oxapayHumanAdminAttentionWhere() })

    const attention = oxapayHumanAdminAttentionWhere()
    const or = attention.OR as Array<Record<string, unknown>>
    const serialized = JSON.stringify(or)
    expect(serialized).toContain('oxapayAwaitingAdminApproval')
    expect(serialized).toContain('underpaid')
    expect(serialized).toContain('manual_accept')
    expect(serialized).toContain('"paid"')
    expect(serialized).toContain('PROVIDER_CONFIRM')
  })
})
