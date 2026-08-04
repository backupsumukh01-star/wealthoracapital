/**
 * Growzy Admin Operating System — shared mock CMS + ops state.
 * Persisted in localStorage. Swap load/save for API later; keep shapes stable.
 */

import {
  FOREX_TICKER,
  HOME_FAQS,
  LANDING_FAQS,
  LIVE_ACTIVITY,
  MONTHLY_RETURNS,
  SAMPLE_TRADES,
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

export const ADMIN_OS_KEY = 'growzy_admin_os_v4'

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
    companyName: 'Growzy',
    heroTitle: 'Forex investing with every trade on record',
    heroSubtitle:
      'AI-assisted strategies, human-verified results and transparent historical performance.',
    heroPrimaryCta: 'Start Investing',
    heroSecondaryCta: 'View Historical Performance',
    heroBannerUrl: '',
    avgMonthlyReturn: '6.8',
    winRate: '68',
    aum: '18.4',
    bestDay: '2.4',
    investorCount: '4820',
    countries: '42',
    riskDisclosure:
      'Forex trading involves substantial risk of loss. Past performance does not guarantee future results. Only invest capital you can afford to lose.',
    footerTagline: 'Transparent forex investing with every trade on record.',
    supportEmail: 'support@growzy.com',
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
      title: 'Welcome to Growzy',
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
  return SAMPLE_TRADES.map((t, i) => ({
    id: `TRD_${1000 + i}`,
    pair: t.pair,
    entry: t.entry,
    exit: t.exit,
    direction: t.direction,
    profitPct: t.returnPct,
    risk: '0.5%',
    notes: 'Desk-verified session trade',
    imageUrl: '',
    status: 'PUBLISHED' as const,
    scheduledAt: null,
    tradingDay: t.date,
    createdAt: `${t.date}T12:00:00.000Z`,
    publishedAt: `${t.date}T18:00:00.000Z`,
  }))
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
      dailyReturn: '0.72',
      weeklyReturn: '3.4',
      monthlyReturn: '6.8',
      yearlyReturn: '54.8',
      bestDay: '2.40',
      worstDay: '-1.20',
      winningPct: '68',
      monthly: MONTHLY_RETURNS.map((m) => ({ month: m.month, returnPct: m.returnPct })),
      yearly: YEARLY_RETURNS.map((y) => ({
        year: y.year,
        returnPct: y.returnPct,
        profitLabel: y.profitLabel,
      })),
      publishedAt: '2026-08-02T18:00:00.000Z',
    },
    trades: seedTrades(),
    inrMethods: [
      {
        id: 'INR_UPI',
        type: 'UPI',
        label: 'UPI',
        upiId: 'growzy@oksbi',
        qrCodeUrl: '',
        instructions: 'Pay via any UPI app and upload the screenshot.',
        enabled: true,
        minDeposit: '50',
        minWithdrawal: '50',
      },
      {
        id: 'INR_GPAY',
        type: 'GOOGLE_PAY',
        label: 'Google Pay',
        upiId: 'growzy@okaxis',
        qrCodeUrl: '',
        instructions: 'Send to the GPay UPI ID shown and upload proof.',
        enabled: true,
        minDeposit: '50',
        minWithdrawal: '50',
      },
      {
        id: 'INR_PHONEPE',
        type: 'PHONEPE',
        label: 'PhonePe',
        upiId: 'growzy@ybl',
        qrCodeUrl: '',
        instructions: 'Complete payment in PhonePe and attach receipt.',
        enabled: true,
        minDeposit: '50',
        minWithdrawal: '50',
      },
      {
        id: 'INR_PAYTM',
        type: 'PAYTM',
        label: 'Paytm',
        upiId: 'growzy@paytm',
        qrCodeUrl: '',
        instructions: 'Pay via Paytm UPI and upload confirmation.',
        enabled: false,
        minDeposit: '50',
        minWithdrawal: '50',
      },
      {
        id: 'INR_BANK',
        type: 'BANK',
        label: 'Bank transfer',
        bankName: 'HDFC Bank',
        accountHolder: 'Growzy Capital FZE',
        accountNumber: '50200012345678',
        ifsc: 'HDFC0001234',
        qrCodeUrl: '',
        instructions: 'NEFT/IMPS only. Use your User ID as payment reference.',
        enabled: true,
        minDeposit: '100',
        minWithdrawal: '100',
      },
    ],
    cryptoWallets: [
      {
        id: 'CRYPTO_USDT_TRC20',
        coin: 'USDT',
        network: 'TRC20',
        address: 'TXyzGrowzyDemoWalletAddress123456',
        qrCodeUrl: '',
        instructions: 'Send only USDT on TRC20. Wrong network may cause loss.',
        enabled: true,
        minDeposit: '50',
        minWithdrawal: '50',
      },
      {
        id: 'CRYPTO_USDT_ERC20',
        coin: 'USDT',
        network: 'ERC20',
        address: '0xGrowzyDemoEthWalletAddressabcdef',
        qrCodeUrl: '',
        instructions: 'Send only USDT on Ethereum. Include gas for ERC20.',
        enabled: true,
        minDeposit: '100',
        minWithdrawal: '100',
      },
    ],
    emailTemplates: buildPremiumEmailTemplateSeed(),
    global: {
      companyName: 'Growzy',
      logoUrl: '/icon',
      theme: 'dark-glass',
      supportEmail: 'support@growzy.com',
      supportWhatsApp: '+971500000000',
      telegram: 'https://t.me/growzy',
      discord: 'https://discord.gg/growzy',
      facebook: 'https://facebook.com/growzy',
      instagram: 'https://instagram.com/growzy',
      minDeposit: '50',
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
      enabled: true,
      names: ['Ravi K.', 'Elena V.', 'James R.', 'Farah A.', 'Noah K.', 'Priya S.', 'Omar H.', 'Sofia R.'],
      countries: ['IN', 'ES', 'GB', 'PK', 'SG', 'AE'],
      depositMin: 500,
      depositMax: 10000,
      withdrawalMin: 200,
      withdrawalMax: 5000,
      delayMs: 9000,
      animationSpeed: 1,
      seedItems: LIVE_ACTIVITY.map((a) => ({ ...a })),
    },
    announcements: [
      {
        id: 'ANN_1',
        type: 'NEWS',
        title: 'August performance update',
        body: 'Monthly programme return tracking ahead of plan. Full chart on Performance.',
        status: 'PUBLISHED',
        scheduledAt: null,
        createdAt: '2026-08-01T10:00:00.000Z',
        publishedAt: '2026-08-01T10:05:00.000Z',
        color: '#12D6A0',
        priority: 'NORMAL',
        expiresAt: null,
        displayPage: 'HOME',
        sticky: true,
        popup: false,
      },
    ],
    pages: [
      {
        id: 'PG_about',
        slug: 'about',
        title: 'About Growzy',
        body: 'Growzy Capital runs a transparent FX desk with AI assistance and human verification.',
        status: 'PUBLISHED',
        updatedAt: now(),
      },
      {
        id: 'PG_terms',
        slug: 'terms',
        title: 'Terms of Service',
        body: 'By using Growzy you agree to the platform terms, risk disclosure, and acceptable use policy.',
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
        body: 'Email support@growzy.com or open a ticket from your dashboard.',
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
      id: `TST_${i + 1}`,
      name: t.name,
      country: t.country,
      quote: t.quote,
      rating: t.rating,
      platform: t.platform,
      enabled: true,
      photoUrl: '',
      publishedAt: '2026-08-01T12:00:00.000Z',
    })),
    tickets: [
      {
        id: 'TKT_1001',
        userId: 'USR_1001',
        userLabel: 'Ayesha Khan',
        subject: 'Withdrawal timing question',
        priority: 'MEDIUM',
        status: 'OPEN',
        assignee: null,
        createdAt: '2026-08-02T11:20:00.000Z',
        messages: [
          {
            id: 'm1',
            from: 'user',
            body: 'How long after approval until funds hit my bank?',
            at: '2026-08-02T11:20:00.000Z',
          },
        ],
      },
      {
        id: 'TKT_1002',
        userId: 'USR_1002',
        userLabel: 'Marcus Ellison',
        subject: 'KYC document resubmit',
        priority: 'HIGH',
        status: 'ASSIGNED',
        assignee: 'support@growzy.com',
        createdAt: '2026-08-01T16:40:00.000Z',
        messages: [
          {
            id: 'm1',
            from: 'user',
            body: 'Passport upload failed — can you reopen my KYC?',
            at: '2026-08-01T16:40:00.000Z',
          },
          {
            id: 'm2',
            from: 'internal',
            body: 'Escalated to KYC officer.',
            at: '2026-08-01T16:55:00.000Z',
          },
        ],
      },
    ],
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
    userTimelines: [
      {
        id: 'UT_1',
        userId: 'USR_1001',
        at: '2026-06-12T09:00:00.000Z',
        type: 'ACCOUNT_CREATED',
        label: 'Account created',
        detail: 'Registered via email',
      },
      {
        id: 'UT_2',
        userId: 'USR_1001',
        at: '2026-06-12T09:05:00.000Z',
        type: 'EMAIL_VERIFIED',
        label: 'Email verified',
        detail: 'OTP confirmed',
      },
      {
        id: 'UT_3',
        userId: 'USR_1001',
        at: '2026-06-12T10:20:00.000Z',
        type: 'KYC_SUBMITTED',
        label: 'KYC submitted',
        detail: 'Passport + selfie',
      },
      {
        id: 'UT_4',
        userId: 'USR_1001',
        at: '2026-06-13T08:00:00.000Z',
        type: 'KYC_APPROVED',
        label: 'KYC approved',
        detail: 'Verified by ops',
      },
      {
        id: 'UT_5',
        userId: 'USR_1001',
        at: '2026-06-14T14:00:00.000Z',
        type: 'DEPOSIT_APPROVED',
        label: 'Deposit approved',
        detail: '$5,000.00',
      },
      {
        id: 'UT_6',
        userId: 'USR_1001',
        at: '2026-08-02T18:10:00.000Z',
        type: 'DAILY_RETURN',
        label: 'Daily return',
        detail: '+0.72%',
      },
    ],
    audit: [
      {
        id: 'AUD_1',
        at: '2026-08-02T18:05:00.000Z',
        admin: 'admin@growzy.com',
        ip: '203.0.113.10',
        browser: 'Chrome 127 · Windows',
        action: 'PUBLISH_DAILY_RETURN',
        user: 'system',
        oldValue: '—',
        newValue: '0.72%',
      },
      {
        id: 'AUD_2',
        at: '2026-08-02T15:12:00.000Z',
        admin: 'admin@growzy.com',
        ip: '203.0.113.10',
        browser: 'Chrome 127 · Windows',
        action: 'APPROVE_DEPOSIT',
        user: 'USR_1001',
        oldValue: 'UNDER_REVIEW',
        newValue: 'APPROVED',
      },
    ],
    campaigns: [],
    analytics: {
      visitors: 18420,
      registrations: 312,
      conversionRate: 1.69,
      countries: 42,
      dailyDeposits: '128400.00',
      dailyWithdrawals: '64200.00',
      activeUsers: 2140,
      onlineUsers: 186,
      pendingKyc: 7,
      pendingDeposits: 4,
      pendingWithdrawals: 2,
      chartVisitors: [
        { day: 'Mon', value: 2100 },
        { day: 'Tue', value: 2450 },
        { day: 'Wed', value: 2680 },
        { day: 'Thu', value: 2510 },
        { day: 'Fri', value: 3120 },
        { day: 'Sat', value: 1890 },
        { day: 'Sun', value: 1670 },
      ],
      chartDeposits: [
        { day: 'Mon', value: 42000 },
        { day: 'Tue', value: 51000 },
        { day: 'Wed', value: 38000 },
        { day: 'Thu', value: 62000 },
        { day: 'Fri', value: 71000 },
        { day: 'Sat', value: 28000 },
        { day: 'Sun', value: 22000 },
      ],
    },
  }
}

export function loadAdminOs(): AdminOsState {
  if (typeof window === 'undefined') return createDefaultAdminOs()
  try {
    const raw = window.localStorage.getItem(ADMIN_OS_KEY)
    if (!raw) {
      const fresh = createDefaultAdminOs()
      window.localStorage.setItem(ADMIN_OS_KEY, JSON.stringify(fresh))
      return fresh
    }
    const parsed = JSON.parse(raw) as Partial<AdminOsState>
    const defaults = createDefaultAdminOs()
    return {
      ...defaults,
      ...parsed,
      landing: { ...defaults.landing, ...parsed.landing, heroMotion: { ...defaults.landing.heroMotion, ...parsed.landing?.heroMotion } },
      landingDraft: {
        ...defaults.landingDraft,
        ...parsed.landingDraft,
        heroMotion: {
          ...defaults.landingDraft.heroMotion,
          ...parsed.landingDraft?.heroMotion,
        },
      },
      tickerDisplay: { ...defaults.tickerDisplay, ...parsed.tickerDisplay },
      heroMotion: { ...defaults.heroMotion, ...parsed.heroMotion },
      siteSeo: { ...defaults.siteSeo, ...parsed.siteSeo },
      media: (parsed.media?.length ? parsed.media : defaults.media).map((m, i) => {
        const base = defaults.media[i]
        const raw = m as Partial<typeof m> & { folder?: string; usedBy?: string }
        return {
          ...base,
          ...m,
          folder: (raw.folder as import('@/lib/admin-cms-extras').MediaFolder) ?? base?.folder ?? 'Images',
          usedBy: raw.usedBy ?? base?.usedBy ?? '—',
        }
      }),
      reportDocs: parsed.reportDocs?.length ? parsed.reportDocs : defaults.reportDocs,
      revisions: (parsed.revisions ?? defaults.revisions).map((r) => ({
        ...r,
        publishDate: r.publishDate ?? null,
      })),
      platformCms: { ...defaults.platformCms, ...parsed.platformCms },
      platformCmsDraft: { ...defaults.platformCmsDraft, ...parsed.platformCmsDraft },
      systemHealth: parsed.systemHealth ?? defaults.systemHealth,
      backupCenter: { ...defaults.backupCenter, ...parsed.backupCenter },
      roleMatrix: parsed.roleMatrix?.length ? parsed.roleMatrix : defaults.roleMatrix,
      toggles: { ...defaults.toggles, ...parsed.toggles },
      ticker: (parsed.ticker ?? defaults.ticker).map((t, i) => ({
        ...defaults.ticker[i],
        ...t,
        tone: t.tone ?? 'auto',
      })),
      testimonials: (parsed.testimonials ?? defaults.testimonials).map((t, i) => ({
        ...defaults.testimonials[i],
        ...t,
        photoUrl: t.photoUrl ?? '',
        publishedAt: t.publishedAt ?? defaults.testimonials[i]?.publishedAt ?? now(),
      })),
      announcements: (parsed.announcements ?? defaults.announcements).map((a) => ({
        ...a,
        color: a.color ?? '#12D6A0',
        priority: a.priority ?? 'NORMAL',
        expiresAt: a.expiresAt ?? null,
        displayPage: a.displayPage ?? 'ALL',
        sticky: a.sticky ?? false,
        popup: a.popup ?? false,
      })),
    }
  } catch {
    return createDefaultAdminOs()
  }
}

export function saveAdminOs(state: AdminOsState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ADMIN_OS_KEY, JSON.stringify(state))
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
    admin: entry.admin ?? 'admin@growzy.com',
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
