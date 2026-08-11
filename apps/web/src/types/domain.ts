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

export type FrontendSectionItem = Record<string, unknown> & {
  id?: string
  title?: string
  label?: string
  description?: string
  body?: string
  value?: string
  prefix?: string
  suffix?: string
  icon?: string
  imageUrl?: string
  enabled?: boolean
}

export type FrontendSection = {
  id: string
  key: string
  label: string
  visible: boolean
  order: number
  eyebrow?: string
  title?: string
  description?: string
  bodyHtml?: string
  primaryCta?: string
  primaryCtaHref?: string
  secondaryCta?: string
  secondaryCtaHref?: string
  imageUrl?: string
  videoUrl?: string
  backgroundUrl?: string
  logoUrl?: string
  items?: FrontendSectionItem[]
  meta?: Record<string, unknown>
}

export type FrontendCmsDocument = {
  status: 'DRAFT' | 'PUBLISHED'
  updatedAt: string
  publishedAt: string | null
  sections: FrontendSection[]
  seo: {
    metaTitle: string
    metaDescription: string
    ogImageUrl: string
    faviconUrl: string
  }
  social: {
    twitter: string
    linkedin: string
    facebook: string
    instagram: string
    discord: string
    telegram: string
    whatsapp: string
  }
  contact: {
    supportEmail: string
    supportPhone: string
    address: string
    hours: string
  }
}

export type CmsPublicDownload = {
  id: string
  title: string
  description: string | null
  category: string
  thumbnailUrl: string | null
  buttonLabel: string
  version: string
  publishDate: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  url: string
  sortOrder: number
}

export type CmsPublicBootstrap = {
  landing: LandingCmsDocument
  platform: PlatformCmsDocument
  frontend?: FrontendCmsDocument | null
  faqs: Array<{ id: string; question: string; answer: string }>
  testimonials: unknown[]
  downloads?: CmsPublicDownload[]
  siteSeo: Record<string, unknown>
  featureFlags: Record<string, boolean>
}

/** `GET /performance/public` — summary + desk analytics for marketing surfaces. */
export type PublicPerformancePayload = {
  summary: import('@meridian/shared').PerformanceSummary
  analytics: {
    winRate: string
    lossRate: string
    averageTrade: string
    bestTrade: { pair?: string; returnPct?: string | null } | null
    worstTrade: { pair?: string; returnPct?: string | null } | null
    totalPnl: string
    roi: string
    openTrades: number
    closedTrades: number
  }
  monthly?: Array<{ month: string; returnPct: string; profit: string }>
  yearly?: Array<{
    year: string
    returnPct: string
    profit: string
    tradingDays?: number
    tradeCount?: number
    winRatePct?: string
  }>
  monthlyDetail?: Array<{
    month: string
    returnPct: string
    profit: string
    tradingDays: number
    tradeCount: number
    winRatePct: string
  }>
  meta?: {
    tradingDayCount: number
    tradeCount: number
    winRatePct: string
    monthCount: number
    startDate: string | null
    endDate: string | null
    startingEquity: string
    endingEquity: string
    totalReturnPct: string
    cagrPct: string
    avgMonthlyReturnPct: string
    maxDrawdownPct: string
    bestDay: { date: string; returnPct: string } | null
    worstDay: { date: string; returnPct: string } | null
    yearsOfPerformance: number
  }
}

export type PublicSettings = {
  companyName: string
  supportEmail: string
  defaultCurrency: string
  maintenanceMode: boolean
  /** Live desk USD→INR rate (decimal string). */
  usdInrRate: string
  /** Units of each currency per 1 USD (display conversion only). */
  currencyRates?: Record<string, string>
  supportedCurrencies?: string[]
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
  referral?: {
    enabled: boolean
    percent: string
    unlockDays: number
  }
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
  environment: 'staging' | 'production' | 'development' | 'test'
  uptimeSeconds?: number
  metrics: Array<{
    id: string
    label: string
    value: string
    detail: string
    tone: 'healthy' | 'warning' | 'critical'
    group?: string
  }>
  widgets?: {
    api: { status: string; uptimeSeconds: number; node: string }
    database: { status: string; latencyMs: number | null }
    redis: { status: string; latencyMs: number | null }
    queue: {
      driver: string
      waiting: number
      active: number
      failed: number
      byGroup: Record<string, { waiting: number; active: number; failed: number }>
    }
    storage: { status: string; driver: string; detail: string }
    emailQueue: { queued: number; sending: number; failed: number; sentToday: number }
    failedJobs: { count: number; detail: string }
    cpu: { load1: number; load5: number; cores: number; processUserMs: number }
    memory: {
      processRssMb: number
      processHeapUsedMb: number
      systemUsedPct: number
      systemFreeMb: number
      systemTotalMb: number
    }
    visitors: { last24h: number; today: number }
    activeUsers: { sessions: number; users: number }
    depositsToday: { count: number; amount: string }
    withdrawalsToday: { count: number; amount: string }
    kycPending: { count: number }
    failedPayments: { depositsRejected: number; withdrawalsRejected: number; total: number }
    stability?: {
      averageResponseMs: number | null
      errorCount: number
      restartCount: number
      dbDisconnectCount: number
      databaseUptimeSeconds: number
      apiUptimeSeconds: number
      gitCommit: string
      buildVersion?: string
      renderInstance: string
      lastDeployment: string
      lastCrash?: { at: string; kind: string; message: string } | null
      diskUsedPct: number | null
      recentCrashes: Array<{ id: string; at: string; kind: string; message: string }>
      backgroundJobs: Array<{ name: string; intervalMs: number; consecutiveFailures: number }>
    }
  }
  logs?: {
    system: Array<{ id: string; at: string; level: string; message: string }>
    audit: Array<{ id: string; at: string; action: string; module: string; actorId: string | null }>
    errors: Array<{ id: string; at: string; level: string; message: string }>
  }
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
