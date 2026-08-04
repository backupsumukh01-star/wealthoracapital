/**
 * Enumerations mirroring the Prisma schema in docs/04-database-schema.md §2.
 * Declared as const objects (not TS `enum`) so they are erasable and usable as values.
 */

export const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const
export type Role = (typeof Role)[keyof typeof Role]

/**
 * Fine-grained operator roles for admin RBAC.
 * Distinct from `Role` so investor sessions stay USER | ADMIN | SUPER_ADMIN.
 */
export const StaffRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  COMPLIANCE_KYC: 'COMPLIANCE_KYC',
  TRADING_MANAGER: 'TRADING_MANAGER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  VIEWER: 'VIEWER',
} as const
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole]

export const UserStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLOCKED: 'BLOCKED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export const KycStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  NEED_MORE_INFO: 'NEED_MORE_INFO',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
} as const
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus]

export const KycDocumentType = {
  PASSPORT: 'PASSPORT',
  NATIONAL_ID: 'NATIONAL_ID',
  DRIVING_LICENSE: 'DRIVING_LICENSE',
  RESIDENCE_PERMIT: 'RESIDENCE_PERMIT',
  PROOF_OF_ADDRESS: 'PROOF_OF_ADDRESS',
  SELFIE: 'SELFIE',
  BANK_STATEMENT: 'BANK_STATEMENT',
  UTILITY_BILL: 'UTILITY_BILL',
} as const
export type KycDocumentType = (typeof KycDocumentType)[keyof typeof KycDocumentType]

export const KycRiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const
export type KycRiskLevel = (typeof KycRiskLevel)[keyof typeof KycRiskLevel]

export const DepositStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus]

export const WithdrawalStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const
export type WithdrawalStatus = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus]

export const PaymentMethodType = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  USDT_TRC20: 'USDT_TRC20',
  USDT_BEP20: 'USDT_BEP20',
  BTC: 'BTC',
  ETH: 'ETH',
  MANUAL: 'MANUAL',
  CRYPTO: 'CRYPTO',
  MOBILE_WALLET: 'MOBILE_WALLET',
  OTHER: 'OTHER',
} as const
export type PaymentMethodType = (typeof PaymentMethodType)[keyof typeof PaymentMethodType]

export const WalletKind = {
  INVESTMENT: 'INVESTMENT',
  PROFIT: 'PROFIT',
  BONUS: 'BONUS',
  REFERRAL: 'REFERRAL',
} as const
export type WalletKind = (typeof WalletKind)[keyof typeof WalletKind]

export const TransactionType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  INVESTMENT: 'INVESTMENT',
  PROFIT: 'PROFIT',
  REFERRAL_BONUS: 'REFERRAL_BONUS',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  TRANSFER: 'TRANSFER',
  REFUND: 'REFUND',
  REVERSAL: 'REVERSAL',
} as const
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]

export const LedgerEntryType = {
  DEPOSIT_APPROVED: 'DEPOSIT_APPROVED',
  WITHDRAWAL_LOCKED: 'WITHDRAWAL_LOCKED',
  WITHDRAWAL_COMPLETED: 'WITHDRAWAL_COMPLETED',
  WITHDRAWAL_REFUNDED: 'WITHDRAWAL_REFUNDED',
  PROFIT_DISTRIBUTION: 'PROFIT_DISTRIBUTION',
  PROFIT_REVERSAL: 'PROFIT_REVERSAL',
  ADJUSTMENT_CREDIT: 'ADJUSTMENT_CREDIT',
  ADJUSTMENT_DEBIT: 'ADJUSTMENT_DEBIT',
  FEE: 'FEE',
  BONUS: 'BONUS',
  TRANSFER: 'TRANSFER',
  REFUND: 'REFUND',
  REVERSAL: 'REVERSAL',
} as const
export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType]

export const TradeDirection = { BUY: 'BUY', SELL: 'SELL' } as const
export type TradeDirection = (typeof TradeDirection)[keyof typeof TradeDirection]

export const TradeStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  OPEN: 'OPEN',
  RUNNING: 'RUNNING',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED',
} as const
export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus]

export const TradeOutcome = { WIN: 'WIN', LOSS: 'LOSS', BREAKEVEN: 'BREAKEVEN' } as const
export type TradeOutcome = (typeof TradeOutcome)[keyof typeof TradeOutcome]

export const AllocationMode = {
  EQUAL: 'EQUAL',
  PERCENTAGE: 'PERCENTAGE',
  CAPITAL: 'CAPITAL',
  MANUAL: 'MANUAL',
} as const
export type AllocationMode = (typeof AllocationMode)[keyof typeof AllocationMode]

export const TradeSource = {
  MANUAL: 'MANUAL',
  CSV_IMPORT: 'CSV_IMPORT',
  MT5_IMPORT: 'MT5_IMPORT',
  API: 'API',
} as const
export type TradeSource = (typeof TradeSource)[keyof typeof TradeSource]

export const TradingDayStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  DISTRIBUTED: 'DISTRIBUTED',
  REVERSED: 'REVERSED',
} as const
export type TradingDayStatus = (typeof TradingDayStatus)[keyof typeof TradingDayStatus]

export const DailyReturnRunStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
} as const
export type DailyReturnRunStatus =
  (typeof DailyReturnRunStatus)[keyof typeof DailyReturnRunStatus]

/** Compounding (on balance) vs simple (on principal). See docs/00 §3.3. */
export const ReturnBasis = { BALANCE: 'BALANCE', INVESTED: 'INVESTED' } as const
export type ReturnBasis = (typeof ReturnBasis)[keyof typeof ReturnBasis]

export const NotificationType = {
  DEPOSIT_SUBMITTED: 'DEPOSIT_SUBMITTED',
  DEPOSIT_APPROVED: 'DEPOSIT_APPROVED',
  DEPOSIT_REJECTED: 'DEPOSIT_REJECTED',
  WITHDRAWAL_SUBMITTED: 'WITHDRAWAL_SUBMITTED',
  WITHDRAWAL_APPROVED: 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED: 'WITHDRAWAL_REJECTED',
  WITHDRAWAL_PAID: 'WITHDRAWAL_PAID',
  DAILY_PROFIT: 'DAILY_PROFIT',
  DAILY_LOSS: 'DAILY_LOSS',
  ACCOUNT_SECURITY: 'ACCOUNT_SECURITY',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  SYSTEM: 'SYSTEM',
  SUPPORT_TICKET_CREATED: 'SUPPORT_TICKET_CREATED',
  SUPPORT_TICKET_REPLIED: 'SUPPORT_TICKET_REPLIED',
  SUPPORT_TICKET_ASSIGNED: 'SUPPORT_TICKET_ASSIGNED',
  SUPPORT_TICKET_CLOSED: 'SUPPORT_TICKET_CLOSED',
  BROADCAST: 'BROADCAST',
  MARKETING: 'MARKETING',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  KYC_INFO_REQUESTED: 'KYC_INFO_REQUESTED',
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  TELEGRAM: 'TELEGRAM',
  WHATSAPP: 'WHATSAPP',
} as const
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel]

/** Every status the UI can be asked to render a badge for. */
export type AnyStatus =
  | UserStatus
  | DepositStatus
  | WithdrawalStatus
  | TradingDayStatus
  | DailyReturnRunStatus
  | KycStatus
