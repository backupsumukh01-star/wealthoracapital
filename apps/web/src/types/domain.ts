/**
 * Centralized domain models for the web app.
 * Canonical API DTOs live in `@meridian/shared` — re-exported here.
 * App-only CMS / ops shapes are defined once in this module.
 */

export type {
  User,
  Wallet,
  WalletSummary,
  Deposit,
  Withdrawal,
  Trade,
  DailyReturnRun,
  Notification,
  AuditLogEntry,
  LedgerEntry,
  PaymentMethod,
  PayoutMethod,
  PerformanceSummary,
  EquityPoint,
  ProfitDistribution,
  SessionInfo,
  MoneyString,
  PercentString,
  IsoDateTime,
  IsoDate,
} from '@meridian/shared'

export type { Role, StaffRole, KycStatus, UserStatus } from '@meridian/shared'

/** Admin identity (staff console). */
export type Admin = {
  id: string
  email: string
  displayName: string
  staffRole: import('@meridian/shared').StaffRole
  permissions: string[]
}

export type SupportTicket = {
  id: string
  subject: string
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'
  userLabel: string
  userId?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH'
  createdAt: string
  updatedAt: string
  messages?: Array<{ id: string; author: string; body: string; at: string }>
}

export type Announcement = {
  id: string
  type: string
  title: string
  body: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: string | null
}

export type EmailTemplate = {
  id: string
  key: string
  name: string
  subject: string
  category: string
}

export type ReportDoc = {
  id: string
  title: string
  type: string
  status: 'DRAFT' | 'PUBLISHED'
  fileName: string
  publishedAt: string | null
}

export type LandingCmsDocument = Record<string, unknown>

export type PlatformCmsDocument = {
  status: 'DRAFT' | 'PUBLISHED'
  updatedAt: string
  publishedAt: string | null
  marketingNav: Array<{ id: string; label: string; href: string; enabled: boolean }>
  dashboard: {
    welcomeTitle: string
    welcomeSubtitle: string
    portfolioEyebrow: string
    emptyStateHint: string
  }
  wallet: {
    title: string
    depositCta: string
    withdrawCta: string
    helperText: string
  }
  trades: { title: string; emptyHint: string }
  performance: { title: string; disclaimer: string }
  supportBlock: { headline: string; body: string }
  riskDisclaimer: string
  contactBlurb: string
}

export type CmsPublicBootstrap = {
  landing: LandingCmsDocument
  platform: PlatformCmsDocument
  faqs: Array<{ id: string; question: string; answer: string }>
  testimonials: unknown[]
  siteSeo: Record<string, unknown>
  featureFlags: Record<string, boolean>
}

export type PublicSettings = {
  companyName: string
  supportEmail: string
  defaultCurrency: string
  maintenanceMode: boolean
  featureFlags: Record<string, boolean>
  limits: {
    minDeposit: string
    maxDeposit: string
    minWithdrawal: string
    maxWithdrawal: string
  }
}

export type PlatformSettings = PublicSettings & {
  timezone: string
  supportPhone?: string
  networks: string[]
  coins: string[]
}

export type SearchHit = {
  id: string
  kind: string
  title: string
  subtitle: string
  href: string
}

export type AdminHealthSnapshot = {
  refreshedAt: string
  version: string
  environment: 'demo' | 'staging' | 'production'
  metrics: Array<{
    id: string
    label: string
    value: string
    detail: string
    tone: 'healthy' | 'warning' | 'critical'
  }>
}

/** UI / async view-model states (not business data). */
export type AsyncViewState =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'ready'
  | 'error'
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'maintenance'
