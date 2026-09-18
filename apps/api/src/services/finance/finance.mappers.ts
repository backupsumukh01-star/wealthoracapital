import type {
  Deposit,
  LedgerEntry,
  PaymentMethod,
  PayoutMethod,
  Wallet,
  Withdrawal,
} from '@prisma/client'

import { env } from '../../config/env.js'
import { moneyDisplay } from '../../utils/money.js'
import { inrDisplay, usdDisplay } from '../../utils/fx.js'

type DepositWithMethod = Deposit & {
  paymentMethod: Pick<PaymentMethod, 'id' | 'name' | 'type'>
}

function nonempty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Canonical authenticated proof URL stored + returned to clients. */
export function buildDepositProofImageUrl(depositId: string): string {
  return `${env.API_URL.replace(/\/$/, '')}/api/v1/deposits/${depositId}/proof-file`
}

export function mapDeposit(deposit: DepositWithMethod) {
  const details =
    deposit.submissionDetails && typeof deposit.submissionDetails === 'object'
      ? (deposit.submissionDetails as Record<string, unknown>)
      : null

  const proofStorageKey = nonempty(deposit.proofKey)
  const proofImageUrl =
    nonempty(deposit.proofImageUrl) ??
    (proofStorageKey ? buildDepositProofImageUrl(deposit.id) : null)

  const coin = nonempty(details?.coin) ?? nonempty(details?.cryptoCoin) ?? nonempty(details?.asset)
  const network = nonempty(details?.network) ?? nonempty(details?.chain)
  const walletAddress =
    nonempty(details?.walletAddress) ??
    nonempty(details?.depositAddress) ??
    nonempty(details?.address) ??
    nonempty(details?.toAddress)
  const hashId =
    nonempty(deposit.txHash) ??
    nonempty(deposit.userReference) ??
    nonempty(details?.txHash) ??
    nonempty(details?.utr) ??
    nonempty(details?.userReference)

  const amountUsd = usdDisplay(deposit.amount)
  const amountInr = deposit.amountInr != null ? inrDisplay(deposit.amountInr) : null
  const gateway = nonempty(details?.gateway)
  const paymentUrl =
    nonempty(details?.plisioInvoiceUrl) ??
    nonempty(details?.oxapayPaymentUrl) ??
    nonempty(details?.paymentUrl)
  const oxapayTrackId =
    nonempty(details?.plisioTxnId) ??
    nonempty(details?.oxapayTrackId) ??
    (gateway === 'oxapay' || gateway === 'plisio' ? nonempty(deposit.userReference) : null)

  return {
    id: deposit.id,
    reference: deposit.reference,
    amount: amountUsd,
    amountUsd,
    amountInr,
    depositUsd: amountUsd,
    depositInr: amountInr,
    creditedAmount: deposit.creditedAmount ? moneyDisplay(deposit.creditedAmount) : null,
    fee: moneyDisplay(deposit.fee),
    currency: deposit.currency,
    status: deposit.status,
    method: {
      id: deposit.paymentMethod.id,
      name: deposit.paymentMethod.name,
      type: deposit.paymentMethod.type,
    },
    hasProof: Boolean(proofStorageKey),
    proofImageUrl,
    proofUrl: proofImageUrl,
    proofStorageKey,
    proofKey: proofStorageKey,
    proofUploadedAt: deposit.proofUploadedAt?.toISOString() ?? null,
    uploadedAt: deposit.proofUploadedAt?.toISOString() ?? null,
    userReference: deposit.userReference,
    txHash: deposit.txHash,
    hashId,
    coin,
    network,
    walletAddress,
    depositAddress: walletAddress,
    transactionHash: nonempty(deposit.txHash) ?? nonempty(details?.txHash),
    notes: deposit.notes ?? null,
    submissionDetails: details,
    rejectionReason: deposit.rejectionReason,
    createdAt: deposit.createdAt.toISOString(),
    reviewedAt: deposit.reviewedAt?.toISOString() ?? null,
    lockDays: deposit.lockDays,
    fundsUnlockAt: deposit.fundsUnlockAt?.toISOString() ?? null,
    fundsLocked:
      deposit.status === 'APPROVED' &&
      deposit.fundsUnlockAt != null &&
      deposit.fundsUnlockAt.getTime() > Date.now(),
    gateway,
    paymentUrl,
    oxapayTrackId,
    expiresAt: deposit.expiresAt?.toISOString() ?? null,
  }
}

export function mapWalletAggregate(wallets: Wallet[]) {
  const investment = wallets.find((w) => w.kind === 'INVESTMENT')
  const profit = wallets.find((w) => w.kind === 'PROFIT')
  const bonus = wallets.find((w) => w.kind === 'BONUS')
  const referral = wallets.find((w) => w.kind === 'REFERRAL')

  // Top-level balances are INVESTMENT-only so REFERRAL/BONUS never inflate portfolio capital.
  return {
    balance: moneyDisplay(investment?.balance ?? 0),
    availableBalance: moneyDisplay(investment?.availableBalance ?? 0),
    lockedBalance: moneyDisplay(investment?.lockedBalance ?? 0),
    pendingBalance: moneyDisplay(investment?.pendingBalance ?? 0),
    investedAmount: moneyDisplay(investment?.investedAmount ?? 0),
    totalProfit: moneyDisplay(
      investment?.totalProfit ?? profit?.totalProfit ?? profit?.balance ?? 0,
    ),
    totalDeposited: moneyDisplay(investment?.totalDeposited ?? 0),
    totalWithdrawn: moneyDisplay(investment?.totalWithdrawn ?? 0),
    currency: investment?.currency ?? 'USD',
    wallets: {
      investment: investment
        ? {
            id: investment.id,
            balance: moneyDisplay(investment.balance),
            available: moneyDisplay(investment.availableBalance),
            locked: moneyDisplay(investment.lockedBalance),
            pending: moneyDisplay(investment.pendingBalance),
          }
        : null,
      profit: profit
        ? {
            id: profit.id,
            balance: moneyDisplay(profit.balance),
            available: moneyDisplay(profit.availableBalance),
          }
        : null,
      bonus: bonus
        ? {
            id: bonus.id,
            balance: moneyDisplay(bonus.balance),
            available: moneyDisplay(bonus.availableBalance),
          }
        : null,
      referral: referral
        ? {
            id: referral.id,
            balance: moneyDisplay(referral.balance),
            available: moneyDisplay(referral.availableBalance),
            locked: moneyDisplay(referral.lockedBalance),
          }
        : null,
    },
  }
}

export function mapLedgerEntry(entry: LedgerEntry) {
  return {
    id: entry.id,
    type: entry.entryType,
    amount: moneyDisplay(entry.signedAmount),
    balanceBefore: entry.balanceBefore ? moneyDisplay(entry.balanceBefore) : moneyDisplay(0),
    balanceAfter: entry.balanceAfter ? moneyDisplay(entry.balanceAfter) : moneyDisplay(0),
    description: entry.description,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    createdAt: entry.createdAt.toISOString(),
  }
}

export function mapPaymentMethod(method: PaymentMethod) {
  // Thin legacy mapper — prefer mapPaymentMethodDetailed when relations are loaded.
  const details =
    method.accountDetails && typeof method.accountDetails === 'object'
      ? (method.accountDetails as Record<string, string>)
      : {}

  return {
    id: method.id,
    name: method.name,
    type: method.type,
    instructions: method.instructions,
    accountDetails: details,
    minAmount: moneyDisplay(method.minAmount),
    maxAmount: method.maxAmount ? moneyDisplay(method.maxAmount) : null,
    isActive: method.isActive,
    network: method.network,
    processingTime: method.processingTime,
    priority: method.priority,
    feePct: moneyDisplay(method.feePct),
    logoKey: method.logoKey ?? null,
    logoUrl: null,
    upi: null,
    bank: null,
    cryptoWallets: [] as [],
  }
}

export function mapPayoutMethod(method: PayoutMethod) {
  const raw = method.details
  const details: Record<string, string> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string') details[key] = value
    }
  }

  return {
    id: method.id,
    label: method.label,
    type: method.type,
    maskedDetails: method.maskedDetails,
    details,
    isDefault: method.isDefault,
    isVerified: method.isVerified,
  }
}

export function mapWithdrawal(withdrawal: Withdrawal) {
  const amountUsd = usdDisplay(withdrawal.amount)
  const amountInr = withdrawal.amountInr != null ? inrDisplay(withdrawal.amountInr) : null

  return {
    id: withdrawal.id,
    reference: withdrawal.reference,
    amount: amountUsd,
    amountUsd,
    amountInr,
    withdrawUsd: amountUsd,
    withdrawInr: amountInr,
    fee: moneyDisplay(withdrawal.fee),
    netAmount: moneyDisplay(withdrawal.netAmount),
    currency: withdrawal.currency,
    status: withdrawal.status === 'COMPLETED' ? 'PAID' : withdrawal.status,
    destinationLabel: withdrawal.destinationLabel,
    destinationSnapshot: withdrawal.destinationSnapshot,
    transactionRef: withdrawal.transactionRef,
    rejectionReason: withdrawal.rejectionReason,
    otpVerifiedAt: withdrawal.otpVerifiedAt?.toISOString() ?? null,
    createdAt: withdrawal.createdAt.toISOString(),
    reviewedAt: withdrawal.reviewedAt?.toISOString() ?? null,
    paidAt: withdrawal.paidAt?.toISOString() ?? null,
  }
}
