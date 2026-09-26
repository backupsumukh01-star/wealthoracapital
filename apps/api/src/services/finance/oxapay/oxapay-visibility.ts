import type { Deposit, DepositStatus, Prisma } from '@prisma/client'

import { OXAPAY_PROVIDER } from './oxapay.types.js'

/** Extra user-visible pending window after OxaPay invoice expiry (30 minutes). */
export const OXAPAY_PENDING_GRACE_MS = 30 * 60 * 1000

/** Fallback invoice lifetime when `expiresAt` is missing (matches server lifetime: 60). */
export const OXAPAY_INVOICE_LIFETIME_MS = 60 * 60 * 1000

const OXAPAY_GATEWAY_JSON_OR: Prisma.DepositWhereInput[] = [
  { submissionDetails: { path: ['gateway'], equals: OXAPAY_PROVIDER } },
  { submissionDetails: { path: ['gateway'], equals: 'OxaPay' } },
]

/**
 * Provider / verification markers that mean a human must see this deposit in
 * Admin PENDING / UNDER_REVIEW — even when auto-confirm is off.
 * Uses fields already written by oxapay-webhook.service (no new statuses).
 */
export function oxapayRequiresHumanAdminAttention(submissionDetails: unknown): boolean {
  if (!submissionDetails || typeof submissionDetails !== 'object' || Array.isArray(submissionDetails)) {
    return false
  }
  const d = submissionDetails as Record<string, unknown>
  if (d.oxapayAwaitingAdminApproval === 'true' || d.oxapayAwaitingAdminApproval === true) {
    return true
  }
  const status = typeof d.oxapayStatus === 'string' ? d.oxapayStatus.trim().toLowerCase() : ''
  if (status === 'underpaid' || status === 'manual_accept' || status === 'paid') {
    return true
  }
  if (typeof d.oxapayVerificationResult === 'string' && d.oxapayVerificationResult.trim().length > 0) {
    return true
  }
  if (typeof d.oxapayVerificationError === 'string' && d.oxapayVerificationError.trim().length > 0) {
    return true
  }
  return false
}

export function isOxapayGateway(submissionDetails: unknown): boolean {
  if (!submissionDetails || typeof submissionDetails !== 'object' || Array.isArray(submissionDetails)) {
    return false
  }
  const gateway = (submissionDetails as Record<string, unknown>).gateway
  return typeof gateway === 'string' && gateway.trim().toLowerCase() === OXAPAY_PROVIDER
}

/** End of user-visible unpaid pending window: invoice expiry + 30m grace. */
export function oxapayUserVisibilityEndsAt(
  expiresAt: Date | null | undefined,
  createdAt: Date,
): Date {
  const invoiceEnd =
    expiresAt && Number.isFinite(expiresAt.getTime())
      ? expiresAt
      : new Date(createdAt.getTime() + OXAPAY_INVOICE_LIFETIME_MS)
  return new Date(invoiceEnd.getTime() + OXAPAY_PENDING_GRACE_MS)
}

/**
 * Unpaid / non-approved OxaPay rows past visibility window — hide from investor
 * history and pending wallet counts. APPROVED deposits always stay visible.
 */
export function shouldHideOxapayFromUserView(
  deposit: Pick<Deposit, 'status' | 'expiresAt' | 'createdAt' | 'submissionDetails'>,
  now = new Date(),
): boolean {
  if (!isOxapayGateway(deposit.submissionDetails)) return false
  if (deposit.status === 'APPROVED') return false
  return now.getTime() >= oxapayUserVisibilityEndsAt(deposit.expiresAt, deposit.createdAt).getTime()
}

/**
 * Ordinary unpaid / abandoned OxaPay invoice — not Admin operational work.
 * Human-review exceptions (provider-confirmed awaiting admin, underpaid,
 * manual_accept, verification failures) return false.
 */
export function isOxapayOrdinaryUnpaidAttempt(
  status: DepositStatus,
  submissionDetails: unknown,
): boolean {
  if (!isOxapayGateway(submissionDetails)) return false
  if (status !== 'PENDING' && status !== 'UNDER_REVIEW') return false
  if (oxapayRequiresHumanAdminAttention(submissionDetails)) return false
  return true
}

/** @deprecated Use isOxapayOrdinaryUnpaidAttempt — was previously too broad. */
export function isOxapayOpenAttempt(status: DepositStatus, submissionDetails: unknown): boolean {
  return isOxapayOrdinaryUnpaidAttempt(status, submissionDetails)
}

/**
 * Prisma filter: exclude abandoned OxaPay unpaid rows from investor list/summary.
 * Uses JSON path on submissionDetails.gateway (Postgres).
 */
export function oxapayUserVisibleWhere(now = new Date()): Prisma.DepositWhereInput {
  const cutoff = new Date(now.getTime() - OXAPAY_PENDING_GRACE_MS)
  const createdCutoff = new Date(now.getTime() - OXAPAY_INVOICE_LIFETIME_MS - OXAPAY_PENDING_GRACE_MS)
  return {
    NOT: {
      AND: [
        { status: { not: 'APPROVED' } },
        { OR: OXAPAY_GATEWAY_JSON_OR },
        {
          OR: [
            { expiresAt: { lte: cutoff } },
            { AND: [{ expiresAt: null }, { createdAt: { lte: createdCutoff } }] },
          ],
        },
      ],
    },
  }
}

/**
 * Prisma OR: existing OxaPay markers that require human Admin attention.
 * Mirrors oxapayRequiresHumanAdminAttention + FinanceReview PROVIDER_CONFIRM.
 */
export function oxapayHumanAdminAttentionWhere(): Prisma.DepositWhereInput {
  return {
    OR: [
      { submissionDetails: { path: ['oxapayAwaitingAdminApproval'], equals: 'true' } },
      { submissionDetails: { path: ['oxapayStatus'], equals: 'underpaid' } },
      { submissionDetails: { path: ['oxapayStatus'], equals: 'manual_accept' } },
      // Paid webhook path (auto-confirm off, verification fail, or info-fetch fail)
      // always merges oxapayStatus=paid before UNDER_REVIEW.
      { submissionDetails: { path: ['oxapayStatus'], equals: 'paid' } },
      { reviews: { some: { decision: 'PROVIDER_CONFIRM' } } },
      { submissionDetails: { path: ['oxapayVerificationResult'], equals: 'ok' } },
      {
        submissionDetails: {
          path: ['oxapayVerificationResult'],
          string_contains: '_',
        },
      },
    ],
  }
}

/**
 * Exclude only ordinary unpaid OxaPay attempts from admin PENDING / UNDER_REVIEW
 * queues and actionable metrics. Provider-confirmed awaiting-admin, underpaid,
 * manual_accept, and verification exceptions remain visible.
 */
export function oxapayAdminOperationalExcludeWhere(): Prisma.DepositWhereInput {
  return {
    NOT: {
      AND: [
        { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        { OR: OXAPAY_GATEWAY_JSON_OR },
        { NOT: oxapayHumanAdminAttentionWhere() },
      ],
    },
  }
}

/**
 * Whether an admin PENDING/UNDER_REVIEW list query would keep this row after
 * oxapayAdminOperationalExcludeWhere (true = visible / not excluded).
 */
export function isVisibleInAdminOperationalQueue(
  status: DepositStatus,
  submissionDetails: unknown,
  opts?: { hasProviderConfirmReview?: boolean },
): boolean {
  if (status !== 'PENDING' && status !== 'UNDER_REVIEW') {
    // Approved / rejected / etc. are not excluded by this filter (filter only
    // applies when the list is scoped to PENDING or UNDER_REVIEW).
    return true
  }
  if (!isOxapayGateway(submissionDetails)) return true
  if (opts?.hasProviderConfirmReview) return true
  if (oxapayRequiresHumanAdminAttention(submissionDetails)) return true
  // Ordinary unpaid OxaPay — excluded
  return false
}

/**
 * Whether cleanup may select this deposit (mirrors oxapayCleanupDueWhere semantics).
 * Ordinary unpaid past grace only — never human-attention exceptions.
 */
export function isEligibleForOxapayCleanup(
  deposit: Pick<Deposit, 'status' | 'expiresAt' | 'createdAt' | 'submissionDetails'>,
  now = new Date(),
): boolean {
  if (!isOxapayOrdinaryUnpaidAttempt(deposit.status, deposit.submissionDetails)) return false
  return now.getTime() >= oxapayUserVisibilityEndsAt(deposit.expiresAt, deposit.createdAt).getTime()
}

/**
 * Ordinary unpaid OxaPay deposits past invoice expiry + 30m grace.
 * Explicitly excludes human-attention cases via the same predicate as admin ops.
 */
export function oxapayCleanupDueWhere(now = new Date()): Prisma.DepositWhereInput {
  const cutoff = new Date(now.getTime() - OXAPAY_PENDING_GRACE_MS)
  const createdCutoff = new Date(now.getTime() - OXAPAY_INVOICE_LIFETIME_MS - OXAPAY_PENDING_GRACE_MS)
  return {
    status: { in: ['PENDING', 'UNDER_REVIEW'] },
    OR: OXAPAY_GATEWAY_JSON_OR,
    AND: [
      {
        OR: [
          { expiresAt: { lte: cutoff } },
          { AND: [{ expiresAt: null }, { createdAt: { lte: createdCutoff } }] },
        ],
      },
      // Same human-attention definition as oxapayAdminOperationalExcludeWhere.
      { NOT: oxapayHumanAdminAttentionWhere() },
    ],
  }
}
