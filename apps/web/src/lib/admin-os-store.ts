/**
 * Wealthora Admin Operating System — CMS + ops draft state.
 * Defaults seed Demo Mode marketing fixtures (ticker, testimonials, FAQs);
 * live CMS/admin APIs override when they provide a full set.
 */

import {
  FOREX_TICKER,
  HOME_FAQS,
  LANDING_FAQS,
  MONTHLY_RETURNS,
  TESTIMONIALS,
  YEARLY_RETURNS,
} from '@/lib/landing-data'
import { buildPremiumEmailTemplateSeed } from '@/lib/premium-email-templates'
import {
  createDefaultCmsExtras,
  type CmsExtrasState,
  type CmsReportDoc,
  type CmsRevision,
  type HeroMotionSettings,
  type MediaAsset,
  type SiteSeoSettings,
  type TickerDisplaySettings,
} from '@/lib/admin-cms-extras'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type PublishStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED'

export type LandingCms = {
  logoUrl: string
  companyName: string
  heroTitle: string
  heroSubtitle: string
  heroPrimaryCta: string
  heroSecondaryCta: string
  heroBannerUrl: string
  avgMonthlyReturn: string
  winRate: string
  aum: string
  bestDay: string
  investorCount: string
  countries: string
  riskDisclosure: string
  footerTagline: string
  supportEmail: string
  whatsapp: string
  telegram: string
  social: { twitter: string; linkedin: string; facebook: string; instagram: string; discord: string }
  homepagePopup: { enabled: boolean; title: string; body: string; cta: string }
  announcementsBanner: string
  /** Hero motion — published with landing */
  heroMotion: HeroMotionSettings
  status: PublishStatus
  updatedAt: string
}

export type TickerPair = {
  id: string
  pair: string
  price: string
  change: string
  enabled: boolean
  featured: boolean
  order: number
  /** Force colour: auto | up | down */
  tone: 'auto' | 'up' | 'down'
}

export type PerformanceSnapshot = {
  dailyReturn: string
  weeklyReturn: string
  monthlyReturn: string
  yearlyReturn: string
  bestDay: string
  worstDay: string
  winningPct: string
  monthly: Array<{ month: string; returnPct: number }>
  yearly: Array<{ year: string; returnPct: number; profitLabel: string }>
  publishedAt: string | null
}

export type CmsTrade = {
  id: string
  pair: string
  entry: string
  exit: string
  direction: 'BUY' | 'SELL' | 'LONG' | 'SHORT'
  profitPct: string
  risk: string
  notes: string
  imageUrl: string
  status: PublishStatus
  scheduledAt: string | null
  tradingDay: string
  createdAt: string
  publishedAt: string | null
}

export type InrPaymentMethod = {
  id: string
  type: 'UPI' | 'GOOGLE_PAY' | 'PHONEPE' | 'PAYTM' | 'BANK'
  label: string
  upiId?: string
  bankName?: string
  accountHolder?: string
  accountNumber?: string
  ifsc?: string
  qrCodeUrl: string
  instructions: string
  enabled: boolean
  minDeposit: string
  minWithdrawal: string
}

export type CryptoWallet = {
  id: string
  coin: string
  network: string
  address: string
  qrCodeUrl: string
  instructions: string
  enabled: boolean
  minDeposit: string
  minWithdrawal: string
}

export type EmailTemplate = {
  id: string
  key: string
  name: string
  subject: string
  bodyHtml: string
  updatedAt: string
}

export type GlobalSettings = {
  companyName: string
  logoUrl: string
  theme: 'dark-glass'
  supportEmail: string
  supportWhatsApp: string
  telegram: string
  discord: string
  facebook: string
  instagram: string
  minDeposit: string
  maxDeposit: string
  minWithdrawal: string
  maxWithdrawal: string
  dailyWithdrawalLimit: string
  supportedCoins: string[]
  supportedNetworks: string[]
  maintenanceMode: boolean
  registrationEnabled: boolean
  depositEnabled: boolean
  withdrawalEnabled: boolean
  referralEnabled: boolean
  kycRequired: boolean
  twoFaRequired: boolean
  defaultCurrency: string
  timezone: string
}

export type FeatureToggles = {
  registration: boolean
  login: boolean
  deposit: boolean
  withdrawal: boolean
  returns: boolean
  referral: boolean
  support: boolean
  trading: boolean
  maintenance: boolean
  kyc: boolean
  reports: boolean
  notifications: boolean
  email: boolean
}

export type LiveActivityConfig = {
  enabled: boolean
  names: string[]
  countries: string[]
  depositMin: number
  depositMax: number
  withdrawalMin: number
  withdrawalMax: number
  delayMs: number
  animationSpeed: number
  seedItems: Array<{
    type: 'deposit' | 'withdrawal' | 'investment' | 'profit'
    name: string
    region: string
    amount: string
  }>
}

export type Announcement = {
  id: string
  type: 'MAINTENANCE' | 'PROMOTION' | 'NEWS' | 'RETURN' | 'POPUP' | 'TOP_BANNER' | 'DASHBOARD_BANNER'
  title: string
  body: string
  status: PublishStatus
  scheduledAt: string | null
  createdAt: string
  publishedAt: string | null
  color: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  expiresAt: string | null
  displayPage: 'ALL' | 'HOME' | 'DASHBOARD' | 'WALLET'
  sticky: boolean
  popup: boolean
}

export type CmsPage = {
  id: string
  slug: 'faq' | 'about' | 'terms' | 'privacy' | 'contact' | 'footer'
  title: string
  body: string
  status: PublishStatus
  updatedAt: string
}

export type FaqItem = { id: string; question: string; answer: string; order: number }

export type TestimonialItem = {
  id: string
  name: string
  country: string
  quote: string
  rating: number
  platform: string
  enabled: boolean
  photoUrl: string
  publishedAt: string
  investmentAmount?: string
  profitPct?: string
}

export type SupportTicket = {
  id: string
  userId: string
  userLabel: string
  subject: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'ASSIGNED' | 'PENDING' | 'CLOSED'
  assignee: string | null
  createdAt: string
  messages: Array<{ id: string; from: 'user' | 'agent' | 'internal'; body: string; at: string }>
}

export type AdminRoleKey =
  | 'SUPER_ADMIN'
  | 'FINANCE'
  | 'SUPPORT'
  | 'KYC_OFFICER'
  | 'TRADING_MANAGER'
  | 'CONTENT_MANAGER'
  | 'VIEWER'

export type AdminRole = {
  key: AdminRoleKey
  label: string
  permissions: string[]
}

export type WalletLedgerEntry = {
  id: string
  userId: string
  userLabel: string
  wallet: 'MAIN' | 'BONUS' | 'TRADING' | 'REFERRAL'
  action: 'ADJUST' | 'BONUS' | 'FREEZE' | 'UNLOCK'
  amount: string
  note: string
  at: string
  admin: string
}

export type UserTimelineEvent = {
  id: string
  userId: string
  at: string
  type: string
  label: string
  detail: string
}

export type OsAuditEntry = {
  id: string
  at: string
  admin: string
  ip: string
  browser: string
  action: string
  user: string
  oldValue: string
  newValue: string
  reason?: string
}

export type NotificationCampaign = {
  id: string
  title: string
  body: string
  audience: 'ALL' | 'SELECTED' | 'SINGLE' | 'COUNTRY' | 'VIP'
  audienceDetail: string
  channels: Array<'BANNER' | 'POPUP' | 'DASHBOARD' | 'PUSH' | 'EMAIL' | 'ANNOUNCEMENT'>
  status: 'DRAFT' | 'SENT'
  createdAt: string
  sentAt: string | null
}

export type AnalyticsSnapshot = {
  visitors: number
  registrations: number
  conversionRate: number
  countries: number
  dailyDeposits: string
  dailyWithdrawals: string
  activeUsers: number
  onlineUsers: number
  pendingKyc: number
  pendingDeposits: number
  pendingWithdrawals: number
  chartVisitors: Array<{ day: string; value: number }>
  chartDeposits: Array<{ day: string; value: number }>
}

export type AdminOsState = {
  landing: LandingCms
  landingDraft: LandingCms
  ticker: TickerPair[]
  performance: PerformanceSnapshot
  trades: CmsTrade[]
  inrMethods: InrPaymentMethod[]
  cryptoWallets: CryptoWallet[]
  emailTemplates: EmailTemplate[]
  global: GlobalSettings
  toggles: FeatureToggles
  activity: LiveActivityConfig
  announcements: Announcement[]
  pages: CmsPage[]
  faqs: FaqItem[]
  testimonials: TestimonialItem[]
  tickets: SupportTicket[]
  roles: AdminRole[]
  walletLedger: WalletLedgerEntry[]
  userTimelines: UserTimelineEvent[]
  audit: OsAuditEntry[]
  campaigns: NotificationCampaign[]
  analytics: AnalyticsSnapshot
} & CmsExtrasState

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function now() {
  return new Date().toISOString()
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function seedLanding(): LandingCms {
  return {
    logoUrl: '/icon',
    companyName: 'Wealthora',
    heroTitle: 'Forex investing with every trade on record',
    heroSubtitle:
      'AI-assisted strategies, human-verified results and transparent historical performance.',
    heroPrimaryCta: 'Start Investing',
    heroSecondaryCta: 'View Historical Performance',
    heroBannerUrl: '',
    avgMonthlyReturn: '15.30',
    winRate: '79.5',
    aum: '2.63',
    bestDay: '3.7',
    investorCount: '1786',
    countries: '42',
    riskDisclosure:
      'Forex trading involves substantial risk of loss. Past performance does not guarantee future results. Only invest capital you can afford to lose.',
    footerTagline: 'Transparent forex investing with every trade on record.',
    supportEmail: 'support@wealthoracapital.com',
    whatsapp: '+971500000000',
    telegram: 'https://t.me/growzy',
    social: {
      twitter: 'https://twitter.com/growzy',
      linkedin: 'https://linkedin.com/company/growzy',
      facebook: 'https://facebook.com/growzy',
      instagram: 'https://instagram.com/growzy',
      discord: 'https://discord.gg/growzy',
    },
    homepagePopup: {
      enabled: false,
      title: 'Welcome to Wealthora',
      body: 'New investors receive onboarding guidance after email verification.',
      cta: 'Get started',
    },
    announcementsBanner: '',
    heroMotion: {
      particlesEnabled: true,
      glowEnabled: true,
      intensity: 1,
    },
    status: 'PUBLISHED',
    updatedAt: now(),
  }
}

function seedTrades(): CmsTrade[] {
  return []
}

export function createDefaultAdminOs(): AdminOsState {
  const landing = seedLanding()
  const extras = createDefaultCmsExtras()
  return {
    ...extras,
    landing: { ...landing, heroMotion: extras.heroMotion },
    landingDraft: { ...landing, heroMotion: extras.heroMotion, status: 'DRAFT' },
    ticker: FOREX_TICKER.map((t, i) => ({
      id: `TK_${i + 1}`,
      pair: t.pair,
      price: t.price,
      change: t.change,
      enabled: true,
      featured: i < 3,
      order: i,
      tone: 'auto' as const,
    })),
    performance: {
      dailyReturn: '0.70',
      weeklyReturn: '2.4',
      monthlyReturn: '15.30',
      yearlyReturn: '54.8',
      bestDay: '2.4',
      worstDay: '-1.2',
      winningPct: '78.6',
      monthly: MONTHLY_RETURNS.map((m) => ({
        month: m.month,
        returnPct: m.returnPct,
      })),
      yearly: YEARLY_RETURNS.map((y) => ({
        year: y.year,
        returnPct: y.returnPct,
        profitLabel: y.profitLabel,
      })),
      publishedAt: now(),
    },
    trades: seedTrades(),
    inrMethods: [],
    cryptoWallets: [],
    emailTemplates: buildPremiumEmailTemplateSeed(),
    global: {
      companyName: 'Wealthora',
      logoUrl: '/icon',
      theme: 'dark-glass',
      supportEmail: 'support@wealthoracapital.com',
      supportWhatsApp: '+971500000000',
      telegram: 'https://t.me/growzy',
      discord: 'https://discord.gg/growzy',
      facebook: 'https://facebook.com/growzy',
      instagram: 'https://instagram.com/growzy',
      minDeposit: '1',
      maxDeposit: '100000',
      minWithdrawal: '50',
      maxWithdrawal: '50000',
      dailyWithdrawalLimit: '25000',
      supportedCoins: ['USDT', 'USDC', 'BTC', 'ETH'],
      supportedNetworks: ['TRC20', 'ERC20', 'BEP20', 'BTC'],
      maintenanceMode: false,
      registrationEnabled: true,
      depositEnabled: true,
      withdrawalEnabled: true,
      referralEnabled: true,
      kycRequired: true,
      twoFaRequired: false,
      defaultCurrency: 'USD',
      timezone: 'Asia/Dubai',
    },
    toggles: {
      registration: true,
      login: true,
      deposit: true,
      withdrawal: true,
      returns: true,
      referral: true,
      support: true,
      trading: true,
      maintenance: false,
      kyc: true,
      reports: true,
      notifications: true,
      email: true,
    },
    activity: {
      enabled: false,
      names: [],
      countries: [],
      depositMin: 0,
      depositMax: 0,
      withdrawalMin: 0,
      withdrawalMax: 0,
      delayMs: 9000,
      animationSpeed: 1,
      seedItems: [],
    },
    announcements: [],
    pages: [
      {
        id: 'PG_about',
        slug: 'about',
        title: 'About Wealthora',
        body: 'Wealthora Capital runs a transparent FX desk with AI assistance and human verification.',
        status: 'PUBLISHED',
        updatedAt: now(),
      },
      {
        id: 'PG_terms',
        slug: 'terms',
        title: 'Terms of Service',
        body: 'By using Wealthora, you agree to the platform terms, risk disclosure and acceptable use policy.',
        status: 'PUBLISHED',
        updatedAt: now(),
      },
      {
        id: 'PG_privacy',
        slug: 'privacy',
        title: 'Privacy Policy',
        body: 'We process identity and wallet data solely to operate the investment platform.',
        status: 'PUBLISHED',
        updatedAt: now(),
      },
      {
        id: 'PG_contact',
        slug: 'contact',
        title: 'Contact',
        body: 'Email support@wealthoracapital.com or open a ticket from your dashboard.',
        status: 'PUBLISHED',
        updatedAt: now(),
      },
      {
        id: 'PG_footer',
        slug: 'footer',
        title: 'Footer',
        body: 'Transparent forex investing with every trade on record.',
        status: 'PUBLISHED',
        updatedAt: now(),
      },
      {
        id: 'PG_faq',
        slug: 'faq',
        title: 'FAQ',
        body: 'See FAQ list in CMS.',
        status: 'PUBLISHED',
        updatedAt: now(),
      },
    ],
    faqs: LANDING_FAQS.map((f, i) => ({
      id: `FAQ_${i + 1}`,
      question: f.question,
      answer: f.answer,
      order: i,
    })),
    testimonials: TESTIMONIALS.map((t, i) => ({
      id: `TM_${i + 1}`,
      name: t.name,
      country: t.country,
      quote: t.quote,
      rating: t.rating,
      platform: t.platform,
      enabled: true,
      photoUrl: '',
      publishedAt: t.date,
    })),
    tickets: [],
    roles: [
      {
        key: 'SUPER_ADMIN',
        label: 'Super Admin',
        permissions: ['*'],
      },
      {
        key: 'FINANCE',
        label: 'Finance',
        permissions: ['deposits', 'withdrawals', 'wallets', 'reports', 'payments'],
      },
      {
        key: 'SUPPORT',
        label: 'Support',
        permissions: ['tickets', 'users.view', 'notifications'],
      },
      {
        key: 'KYC_OFFICER',
        label: 'KYC Officer',
        permissions: ['kyc', 'users.view'],
      },
      {
        key: 'TRADING_MANAGER',
        label: 'Trading Manager',
        permissions: ['trades', 'returns', 'performance', 'ticker'],
      },
      {
        key: 'CONTENT_MANAGER',
        label: 'Content Manager',
        permissions: ['cms', 'announcements', 'emails', 'activity'],
      },
      {
        key: 'VIEWER',
        label: 'Viewer',
        permissions: ['users.view', 'reports.view', 'audit.view'],
      },
    ],
    walletLedger: [],
    userTimelines: [],
    audit: [],
    campaigns: [],
    analytics: {
      visitors: 0,
      registrations: 0,
      conversionRate: 0,
      countries: 0,
      dailyDeposits: '0.00',
      dailyWithdrawals: '0.00',
      activeUsers: 0,
      onlineUsers: 0,
      pendingKyc: 0,
      pendingDeposits: 0,
      pendingWithdrawals: 0,
      chartVisitors: [],
      chartDeposits: [],
    },
  }
}

export function loadAdminOs(): AdminOsState {
  return createDefaultAdminOs()
}

export function saveAdminOs(_state: AdminOsState) {
  // Intentionally no-op: never write CMS/ops state to browser storage.
}

export function pushAudit(
  state: AdminOsState,
  entry: Omit<OsAuditEntry, 'id' | 'at' | 'ip' | 'browser' | 'admin'> & {
    admin?: string
  },
): AdminOsState {
  const row: OsAuditEntry = {
    id: id('AUD'),
    at: now(),
    admin: entry.admin ?? 'admin@wealthoracapital.com',
    ip: '203.0.113.10',
    browser: 'Chrome 127 · Windows',
    action: entry.action,
    user: entry.user,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    reason: entry.reason,
  }
  return { ...state, audit: [row, ...state.audit].slice(0, 500) }
}

export { id as adminOsId, now as adminOsNow, HOME_FAQS }
