import type {
  Deposit,
  LedgerEntry,
  PaymentMethod,
  PayoutMethod,
  Prisma,
  Wallet,
  Withdrawal,
} from '@prisma/client'

import { d, moneyDisplay } from '../../utils/money.js'

type DepositWithMethod = Deposit & {
  paymentMethod: Pick<PaymentMethod, 'id' | 'name' | 'type'>
}

export function mapWalletAggregate(wallets: Wallet[]) {
  const investment = wallets.find((w) => w.kind === 'INVESTMENT')
  const profit = wallets.find((w) => w.kind === 'PROFIT')
  const bonus = wallets.find((w) => w.kind === 'BONUS')
  const referral = wallets.find((w) => w.kind === 'REFERRAL')

  const sum = (pick: (w: Wallet) => Prisma.Decimal | string) =>
    wallets.reduce((acc, w) => acc.plus(d(pick(w))), d(0))

  return {
    balance: moneyDisplay(sum((w) => w.balance)),
    availableBalance: moneyDisplay(sum((w) => w.availableBalance)),
    lockedBalance: moneyDisplay(sum((w) => w.lockedBalance)),
    pendingBalance: moneyDisplay(sum((w) => w.pendingBalance)),
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
        ? { id: profit.id, balance: moneyDisplay(profit.balance) }
        : null,
      bonus: bonus ? { id: bonus.id, balance: moneyDisplay(bonus.balance) } : null,
      referral: referral
        ? { id: referral.id, balance: moneyDisplay(referral.balance) }
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

export function mapDeposit(deposit: DepositWithMethod) {
  return {
    id: deposit.id,
    reference: deposit.reference,
    amount: moneyDisplay(deposit.amount),
    creditedAmount: deposit.creditedAmount ? moneyDisplay(deposit.creditedAmount) : null,
    fee: moneyDisplay(deposit.fee),
    currency: deposit.currency,
    status: deposit.status,
    method: {
      id: deposit.paymentMethod.id,
      name: deposit.paymentMethod.name,
      type: deposit.paymentMethod.type,
    },
    hasProof: Boolean(deposit.proofKey),
    userReference: deposit.userReference,
    txHash: deposit.txHash,
    notes: deposit.notes ?? null,
    submissionDetails:
      deposit.submissionDetails && typeof deposit.submissionDetails === 'object'
        ? (deposit.submissionDetails as Record<string, unknown>)
        : null,
    rejectionReason: deposit.rejectionReason,
    createdAt: deposit.createdAt.toISOString(),
    reviewedAt: deposit.reviewedAt?.toISOString() ?? null,
  }
}

export function mapPayoutMethod(method: PayoutMethod) {
  return {
    id: method.id,
    label: method.label,
    type: method.type,
    maskedDetails: method.maskedDetails,
    isDefault: method.isDefault,
    isVerified: method.isVerified,
  }
}

export function mapWithdrawal(withdrawal: Withdrawal) {
  return {
    id: withdrawal.id,
    reference: withdrawal.reference,
    amount: moneyDisplay(withdrawal.amount),
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
