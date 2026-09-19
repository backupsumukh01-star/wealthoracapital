/**
 * CMS v4 extensions — media folders, platform copy, system health, backup center, permissions.
 * Merged into AdminOsState; storage key bump when shapes change.
 */

export type MediaKind = 'image' | 'icon' | 'pdf' | 'video' | 'svg' | 'logo' | 'background' | 'other'

export type MediaFolder =
  | 'Images'
  | 'Logos'
  | 'Icons'
  | 'Documents'
  | 'PDF'
  | 'Reports'
  | 'Email Assets'
  | 'Landing Assets'

export type MediaAsset = {
  id: string
  name: string
  kind: MediaKind
  folder: MediaFolder
  mime: string
  sizeLabel: string
  url: string
  usedBy: string
  createdAt: string
  updatedAt: string
}

export type ReportDocType = 'MONTHLY_PDF' | 'WEEKLY_PDF' | 'DAILY' | 'PERFORMANCE_PDF' | 'EXCEL' | 'CSV'

export type CmsReportDoc = {
  id: string
  title: string
  type: ReportDocType
  periodLabel: string
  fileName: string
  url: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  createdAt: string
  downloads: number
}

export type SiteSeoSettings = {
  websiteName: string
  logoUrl: string
  faviconUrl: string
  metaTitle: string
  metaDescription: string
  googleAnalyticsId: string
  facebookPixelId: string
  maintenanceMode: boolean
  maintenanceMessage: string
  supportHours: string
  supportPhone: string
  supportEmail: string
  companyAddress: string
  defaultLanguage: string
}

export type TickerDisplaySettings = {
  enabled: boolean
  scrollSpeed: number
  refreshMs: number
  direction: 'left' | 'right'
  upColor: string
  downColor: string
}

export type HeroMotionSettings = {
  particlesEnabled: boolean
  glowEnabled: boolean
  intensity: number
}

export type CmsRevision = {
  id: string
  module: string
  label: string
  snapshot: string
  at: string
  admin: string
  publishDate: string | null
}

/** Investor + marketing copy editable without code. */
export type PlatformCms = {
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
  trades: {
    title: string
    emptyHint: string
  }
  performance: {
    title: string
    disclaimer: string
  }
  supportBlock: {
    headline: string
    body: string
  }
  riskDisclaimer: string
  contactBlurb: string
}

export type HealthTone = 'healthy' | 'warning' | 'critical'

export type HealthMetric = {
  id: string
  label: string
  value: string
  detail: string
  tone: HealthTone
  group: 'infra' | 'services' | 'ops' | 'security'
}

export type SystemHealthState = {
  refreshedAt: string
  version: string
  environment: 'staging' | 'production'
  metrics: HealthMetric[]
}

export type BackupRestorePoint = {
  id: string
  label: string
  at: string
  sizeLabel: string
  scope: string
}

export type BackupCenterState = {
  lastBackupAt: string
  nextBackupAt: string
  lastSizeLabel: string
  autoSchedule: string
  points: BackupRestorePoint[]
}

export type PermissionFlag = string

export type RolePermissionRow = {
  roleKey: string
  label: string
  permissions: Record<PermissionFlag, boolean>
}

export type CmsExtrasState = {
  media: MediaAsset[]
  reportDocs: CmsReportDoc[]
  siteSeo: SiteSeoSettings
  tickerDisplay: TickerDisplaySettings
  heroMotion: HeroMotionSettings
  revisions: CmsRevision[]
  platformCms: PlatformCms
  platformCmsDraft: PlatformCms
  systemHealth: SystemHealthState
  backupCenter: BackupCenterState
  roleMatrix: RolePermissionRow[]
}

export const PERMISSION_FLAGS: PermissionFlag[] = [
  'users.view',
  'users.edit',
  'kyc.review',
  'deposits.review',
  'withdrawals.review',
  'wallets.adjust',
  'trades.publish',
  'returns.publish',
  'cms.edit',
  'cms.publish',
  'emails.send',
  'support.reply',
  'reports.export',
  'settings.edit',
  'roles.edit',
  'audit.view',
]

export function createDefaultSystemHealth(): SystemHealthState {
  const now = new Date().toISOString()
  return {
    refreshedAt: now,
    version: 'Wealthora Web 0.1.0',
    environment: 'production',
    metrics: [],
  }
}

export function createDefaultPlatformCms(): PlatformCms {
  const now = new Date().toISOString()
  return {
    status: 'PUBLISHED',
    updatedAt: now,
    publishedAt: now,
    marketingNav: [
      { id: 'home', label: 'Home', href: '/', enabled: true },
      { id: 'performance', label: 'Performance', href: '/performance', enabled: true },
      { id: 'strategy', label: 'Strategy', href: '/our-trading-system', enabled: true },
      { id: 'how', label: 'How It Works', href: '/how-it-works', enabled: true },
      { id: 'faq', label: 'FAQ', href: '/faq', enabled: true },
      { id: 'contact', label: 'Contact', href: '/contact', enabled: true },
    ],
    dashboard: {
      welcomeTitle: 'Your Wealthora portfolio',
      welcomeSubtitle: 'Balances, returns and desk activity in one place.',
      portfolioEyebrow: 'Portfolio',
      emptyStateHint: 'Fund your wallet to start receiving published daily returns.',
    },
    wallet: {
      title: 'Wallet Center',
      depositCta: 'Deposit',
      withdrawCta: 'Withdraw',
      helperText: 'Deposits require KYC approval. Withdrawals may take 1–2 business days.',
    },
    trades: {
      title: 'Trade history',
      emptyHint: 'Published desk trades will appear here.',
    },
    performance: {
      title: 'My performance',
      disclaimer: 'Past performance does not guarantee future results.',
    },
    supportBlock: {
      headline: 'Need help?',
      body: 'Open a ticket or email support — we typically reply within one business day.',
    },
    riskDisclaimer:
      'Forex and leveraged products involve significant risk of loss. Only invest capital you can afford to lose.',
    contactBlurb: 'Reach Wealthora Capital for onboarding, KYC or operational questions.',
  }
}

export function createDefaultRoleMatrix(): RolePermissionRow[] {
  const all = Object.fromEntries(PERMISSION_FLAGS.map((p) => [p, true])) as Record<string, boolean>
  const none = Object.fromEntries(PERMISSION_FLAGS.map((p) => [p, false])) as Record<string, boolean>
  const view = { ...none, 'users.view': true, 'audit.view': true, 'reports.export': true }
  return [
    { roleKey: 'SUPER_ADMIN', label: 'Super Admin', permissions: all },
    {
      roleKey: 'FINANCE',
      label: 'Finance Manager',
      permissions: {
        ...none,
        'users.view': true,
        'deposits.review': true,
        'withdrawals.review': true,
        'wallets.adjust': true,
        'reports.export': true,
        'audit.view': true,
      },
    },
    {
      roleKey: 'KYC_OFFICER',
      label: 'Compliance (KYC)',
      permissions: { ...none, 'users.view': true, 'kyc.review': true, 'audit.view': true },
    },
    {
      roleKey: 'TRADING_MANAGER',
      label: 'Trading Manager',
      permissions: {
        ...none,
        'trades.publish': true,
        'returns.publish': true,
        'reports.export': true,
        'audit.view': true,
      },
    },
    {
      roleKey: 'SUPPORT',
      label: 'Support Agent',
      permissions: {
        ...none,
        'users.view': true,
        'support.reply': true,
        'emails.send': true,
        'audit.view': true,
      },
    },
    {
      roleKey: 'CONTENT_MANAGER',
      label: 'Content Manager',
      permissions: {
        ...none,
        'cms.edit': true,
        'cms.publish': true,
        'emails.send': true,
        'audit.view': true,
      },
    },
    { roleKey: 'VIEWER', label: 'Viewer', permissions: view },
  ]
}

export function createDefaultCmsExtras(): CmsExtrasState {
  const now = new Date().toISOString()
  const platform = createDefaultPlatformCms()
  return {
    media: [
      {
        id: 'MED_logo',
        name: 'Wealthora mark',
        kind: 'logo',
        folder: 'Logos',
        mime: 'image/png',
        sizeLabel: '12 KB',
        url: '/icon',
        usedBy: 'Nav · Footer · SEO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'MED_bg',
        name: 'Hero atmosphere',
        kind: 'background',
        folder: 'Landing Assets',
        mime: 'image/svg+xml',
        sizeLabel: '—',
        url: '',
        usedBy: 'Landing hero',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'MED_report',
        name: 'August statement cover',
        kind: 'pdf',
        folder: 'Reports',
        mime: 'application/pdf',
        sizeLabel: '240 KB',
        url: '#',
        usedBy: 'Report library',
        createdAt: now,
        updatedAt: now,
      },
    ],
    reportDocs: [
      {
        id: 'REP_AUG',
        title: 'August 2026 monthly statement',
        type: 'MONTHLY_PDF',
        periodLabel: 'Aug 2026',
        fileName: 'wealthora-august-2026.pdf',
        url: '#',
        status: 'PUBLISHED',
        publishedAt: now,
        createdAt: now,
        downloads: 128,
      },
      {
        id: 'REP_W32',
        title: 'Week 32 performance brief',
        type: 'WEEKLY_PDF',
        periodLabel: 'W32 2026',
        fileName: 'wealthora-week-32.pdf',
        url: '#',
        status: 'PUBLISHED',
        publishedAt: now,
        createdAt: now,
        downloads: 64,
      },
      {
        id: 'REP_CSV',
        title: 'Trade tape export',
        type: 'CSV',
        periodLabel: 'YTD',
        fileName: 'trades-ytd.csv',
        url: '#',
        status: 'PUBLISHED',
        publishedAt: now,
        createdAt: now,
        downloads: 41,
      },
    ],
    siteSeo: {
      websiteName: 'Wealthora Capital',
      logoUrl: '/icon',
      faviconUrl: '/icon',
      metaTitle: 'Wealthora — Forex investing with every trade on record',
      metaDescription:
        'AI-assisted strategies, human-verified results and transparent historical performance.',
      googleAnalyticsId: '',
      facebookPixelId: '',
      maintenanceMode: false,
      maintenanceMessage: 'We are upgrading ledger infrastructure. Back shortly.',
      supportHours: 'Mon–Fri 09:00–18:00 GST',
      supportPhone: '+971 50 000 0000',
      supportEmail: 'support@wealthoracapital.com',
      companyAddress: 'Dubai International Financial Centre, Dubai, UAE',
      defaultLanguage: 'en',
    },
    tickerDisplay: {
      enabled: true,
      scrollSpeed: 38,
      refreshMs: 2800,
      direction: 'left',
      upColor: '#3CCB91',
      downColor: '#F87171',
    },
    heroMotion: {
      particlesEnabled: true,
      glowEnabled: true,
      intensity: 1,
    },
    revisions: [],
    platformCms: platform,
    platformCmsDraft: { ...platform, status: 'DRAFT' },
    systemHealth: createDefaultSystemHealth(),
    backupCenter: {
      lastBackupAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      nextBackupAt: new Date(Date.now() + 22 * 3600_000).toISOString(),
      lastSizeLabel: '2.4 MB',
      autoSchedule: 'Daily 02:00 GST',
      points: [
        {
          id: 'BP1',
          label: 'Nightly full',
          at: new Date(Date.now() - 2 * 3600_000).toISOString(),
          sizeLabel: '2.4 MB',
          scope: 'full',
        },
        {
          id: 'BP2',
          label: 'CMS content',
          at: new Date(Date.now() - 26 * 3600_000).toISOString(),
          sizeLabel: '840 KB',
          scope: 'content',
        },
        {
          id: 'BP3',
          label: 'Settings snapshot',
          at: new Date(Date.now() - 50 * 3600_000).toISOString(),
          sizeLabel: '64 KB',
          scope: 'settings',
        },
      ],
    },
    roleMatrix: createDefaultRoleMatrix(),
  }
}

export function pushRevision(
  revisions: CmsRevision[],
  module: string,
  label: string,
  snapshot: unknown,
  opts?: { publishDate?: string | null },
): CmsRevision[] {
  const row: CmsRevision = {
    id: `REV_${Math.random().toString(36).slice(2, 9)}`,
    module,
    label,
    snapshot: JSON.stringify(snapshot).slice(0, 12000),
    at: new Date().toISOString(),
    admin: 'admin@wealthoracapital.com',
    publishDate: opts?.publishDate ?? null,
  }
  return [row, ...revisions].slice(0, 120)
}
