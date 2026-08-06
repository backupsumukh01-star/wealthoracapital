/**
 * DTO shapes returned by the API.
 *
 * `MoneyString` and `PercentString` exist because money never crosses the network as a JSON
 * number (docs/00 §3.5). The distinct aliases keep the intent readable at every call site and
 * let `<Money>` refuse a `number` at the type level.
 */

import type {
  DailyReturnRunStatus,
  DepositStatus,
  KycStatus,
  LedgerEntryType,
  NotificationType,
  PaymentMethodType,
  ReturnBasis,
  Role,
  TradeDirection,
  TradeOutcome,
  TradingDayStatus,
  UserStatus,
  WithdrawalStatus,
} from './enums'

/** A decimal amount serialised as a string, e.g. `"1250.75"`. Never a `number`. */
export type MoneyString = string
/** A percentage serialised as a string, e.g. `"0.700000"`. Never a `number`. */
export type PercentString = string
/** ISO 8601 UTC instant, e.g. `"2026-08-02T09:00:00.000Z"`. */
export type IsoDateTime = string
/** Date-only value, e.g. `"2026-08-02"`. */
export type IsoDate = string

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  country: string | null
  timezone: string
  avatarUrl: string | null
  role: Role
  /** Operator specialty — null for pure investors. */
  staffRole: import('./enums').StaffRole | null
  /** Resolved permission keys for the current role/staffRole. */
  permissions: string[]
  status: UserStatus
  kycStatus: KycStatus
  emailVerified: boolean
  deletedAt?: IsoDateTime | null
  createdAt: IsoDateTime
}

export interface Wallet {
  balance: MoneyString
  availableBalance: MoneyString
  lockedBalance: MoneyString
  investedAmount: MoneyString
  totalProfit: MoneyString
  totalDeposited: MoneyString
  totalWithdrawn: MoneyString
  currency: string
}

export interface LedgerEntry {
  id: string
  type: LedgerEntryType
  amount: MoneyString
  balanceBefore: MoneyString
  balanceAfter: MoneyString
  description: string | null
  referenceType: string | null
  referenceId: string | null
  createdAt: IsoDateTime
}

export interface PaymentMethodUpiDetails {
  upiId: string
  accountHolderName: string
  qrCodeKey: string | null
  qrCodeUrl: string | null
}

export interface PaymentMethodBankDetails {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  branch: string | null
  accountType: string | null
  qrCodeKey: string | null
  qrCodeUrl: string | null
}

export interface CryptoWalletAddress {
  id: string
  paymentMethodId: string | null
  label: string
  coin: string
  network: string
  address: string
  memo: string | null
  instructions: string | null
  qrCodeKey: string | null
  qrCodeUrl: string | null
  minAmount: MoneyString | null
  maxAmount: MoneyString | null
  sortOrder: number
  isDefault: boolean
  isActive: boolean
}

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
  instructions: string
  /** @deprecated Prefer `upi` / `bank` / `cryptoWallets`. Derived for older clients. */
  accountDetails: Record<string, string>
  minAmount: MoneyString
  maxAmount: MoneyString | null
  feePct?: MoneyString
  processingTime: string | null
  priority: number
  isActive: boolean
  logoKey: string | null
  logoUrl: string | null
  network: string | null
  upi: PaymentMethodUpiDetails | null
  bank: PaymentMethodBankDetails | null
  cryptoWallets: CryptoWalletAddress[]
}

export interface Deposit {
  id: string
  reference: string
  amount: MoneyString
  creditedAmount: MoneyString | null
  fee: MoneyString
  currency?: string
  status: DepositStatus
  method: Pick<PaymentMethod, 'id' | 'name' | 'type'> | null
  hasProof: boolean
  userReference: string | null
  txHash?: string | null
  notes?: string | null
  submissionDetails?: Record<string, unknown> | null
  rejectionReason: string | null
  createdAt: IsoDateTime
  reviewedAt: IsoDateTime | null
}

export interface PayoutMethod {
  id: string
  label: string
  type: PaymentMethodType
  maskedDetails: string
  isDefault: boolean
  isVerified: boolean
}

export interface Withdrawal {
  id: string
  reference: string
  amount: MoneyString
  fee: MoneyString
  netAmount: MoneyString
  currency?: string
  status: WithdrawalStatus
  destinationLabel: string
  destinationSnapshot?: Record<string, unknown> | null
  transactionRef: string | null
  rejectionReason: string | null
  otpVerifiedAt?: IsoDateTime | null
  createdAt: IsoDateTime
  reviewedAt: IsoDateTime | null
  paidAt: IsoDateTime | null
}

export interface Trade {
  id: string
  date: IsoDate
  pair: string
  direction: TradeDirection
  entryPrice: string
  exitPrice: string
  stopLoss: string | null
  takeProfit: string | null
  lotSize: string | null
  returnPct: PercentString
  pips: string | null
  outcome: TradeOutcome
  openedAt: IsoDateTime | null
  closedAt: IsoDateTime | null
  notes: string | null
  isPublic: boolean
}

export interface TradingDay {
  id: string
  date: IsoDate
  status: TradingDayStatus
  netReturnPct: PercentString | null
  computedReturnPct: PercentString | null
  tradeCount: number
  winCount: number
  lossCount: number
  summary: string | null
}

export interface ProfitDistribution {
  id: string
  date: IsoDate
  eligibleBalance: MoneyString
  returnPct: PercentString
  grossAmount: MoneyString
  amount: MoneyString
  balanceAfter: MoneyString
  isReversed: boolean
  createdAt: IsoDateTime
}

export interface DailyReturnRun {
  id: string
  date: IsoDate
  returnPct: PercentString
  returnBasis: ReturnBasis
  status: DailyReturnRunStatus
  eligibleWallets: number
  processedWallets: number
  totalBaseAmount: MoneyString
  totalDistributed: MoneyString
  roundingDelta: MoneyString
  startedAt: IsoDateTime | null
  completedAt: IsoDateTime | null
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  actionUrl: string | null
  readAt: IsoDateTime | null
  createdAt: IsoDateTime
}

export interface EquityPoint {
  date: IsoDate
  balance: MoneyString
  profit: MoneyString
  cumulativeProfit: MoneyString
}

export interface PerformanceSummary {
  roiPct: PercentString
  thisMonthProfit: MoneyString
  thisMonthReturnPct: PercentString
  lastMonthReturnPct: PercentString
  bestDay: { date: IsoDate; returnPct: PercentString; profit: MoneyString } | null
  worstDay: { date: IsoDate; returnPct: PercentString; profit: MoneyString } | null
  winRatePct: PercentString
  activeDays: number
  avgDailyReturnPct: PercentString
}

/** The dashboard's single aggregate payload — `GET /wallet/summary`. */
export interface WalletSummary {
  wallet: Wallet
  today: {
    date: IsoDate
    profit: MoneyString
    returnPct: PercentString
    status: 'DISTRIBUTED' | 'PENDING'
    tradeCount: number
  }
  performance: PerformanceSummary
  chart: { range: string; points: EquityPoint[] }
  recentTrades: Trade[]
  pending: { deposits: number; withdrawals: number }
  unreadNotifications: number
}

export interface SessionInfo {
  id: string
  device: string
  browser: string
  ip: string
  location: string | null
  lastUsedAt: IsoDateTime
  isCurrent: boolean
}

export interface AuditLogEntry {
  id: string
  actorName: string | null
  actorRole: Role | null
  action: string
  targetType: string | null
  targetId: string | null
  reason: string | null
  ip: string | null
  createdAt: IsoDateTime
}
