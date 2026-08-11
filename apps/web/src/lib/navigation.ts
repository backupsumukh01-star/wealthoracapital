import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Bell,
  CandlestickChart,
  ChartNoAxesCombined,
  CreditCard,
  FileClock,
  FileCheck2,
  FileDown,
  Gauge,
  HeartPulse,
  History,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  LogOut,
  Mail,
  Megaphone,
  Monitor,
  Newspaper,
  PieChart,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  TrendingUp,
  Users,
  UserCog,
  Wallet,
} from 'lucide-react'
import { ROUTES } from '@meridian/shared'

export interface NavItem {
  label: string
  href: string
  icon?: LucideIcon
  description?: string
  /** Matches nested routes too, e.g. `/trades/abc` highlights `/trades`. */
  matchNested?: boolean
  badge?: 'v1.1' | 'super-admin'
  /** RBAC permission required to show this nav item (anyOf if array). */
  permission?: string | string[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/* -------------------------------------------------------------------------- */
/* Marketing                                                                  */
/* -------------------------------------------------------------------------- */

export const MARKETING_NAV: NavItem[] = [
  { label: 'Home', href: ROUTES.marketing.home, description: 'Platform overview' },
  {
    label: 'Performance',
    href: ROUTES.marketing.performance,
    description: 'Public track record',
  },
  {
    label: 'Historical Performance',
    href: ROUTES.marketing.historicalPerformance,
    description: '3-Year Verified Demo Backtest',
  },
  {
    label: 'Strategy',
    href: ROUTES.marketing.ourTradingSystem,
    description: 'How returns are generated',
  },
  {
    label: 'How It Works',
    href: ROUTES.marketing.howItWorks,
    description: 'Four-step walkthrough',
  },
  {
    label: 'Transparency',
    href: ROUTES.marketing.transparency,
    description: 'Trades, ledgers, audits',
  },
  {
    label: 'Investors',
    href: ROUTES.marketing.investors,
    description: 'Community and footprint',
  },
  { label: 'FAQ', href: ROUTES.marketing.faq, description: 'Common questions' },
  { label: 'Contact', href: ROUTES.marketing.contact, description: 'Talk to support' },
]

export const MARKETING_SECONDARY_NAV: NavItem[] = [
  {
    label: 'Security',
    href: ROUTES.marketing.security,
    description: 'Risk and capital controls',
  },
  {
    label: 'Technology',
    href: ROUTES.marketing.technology,
    description: 'Engines and infrastructure',
  },
  { label: 'About', href: ROUTES.marketing.about, description: 'Desk and principles' },
  {
    label: 'Resources',
    href: ROUTES.marketing.resources,
    description: 'Guides and downloads',
  },
]

export const FOOTER_NAV: NavSection[] = [
  {
    label: 'Product',
    items: [
      { label: 'Our trading system', href: ROUTES.marketing.ourTradingSystem },
      { label: 'Performance', href: ROUTES.marketing.performance },
      { label: 'Historical Performance', href: ROUTES.marketing.historicalPerformance },
      { label: 'Transparency', href: ROUTES.marketing.transparency },
      { label: 'Security', href: ROUTES.marketing.security },
      { label: 'Technology', href: ROUTES.marketing.technology },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'About Growzy', href: ROUTES.marketing.about },
      { label: 'Investors', href: ROUTES.marketing.investors },
      { label: 'Resources', href: ROUTES.marketing.resources },
      { label: 'Contact', href: ROUTES.marketing.contact },
    ],
  },
  {
    label: 'Legal',
    items: [
      { label: 'Risk disclosure', href: ROUTES.marketing.legal.riskDisclosure },
      { label: 'Terms of service', href: ROUTES.marketing.legal.terms },
      { label: 'Privacy policy', href: ROUTES.marketing.legal.privacy },
      { label: 'Refund policy', href: ROUTES.marketing.legal.refundPolicy },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Investor dashboard — flat premium wealth nav                               */
/* -------------------------------------------------------------------------- */

export const DASHBOARD_NAV: NavSection[] = [
  {
    label: 'Invest',
    items: [
      {
        label: 'Dashboard',
        href: ROUTES.dashboard.root,
        icon: LayoutDashboard,
        description: 'Portfolio overview',
        permission: 'performance.view',
      },
      {
        label: 'Portfolio',
        href: ROUTES.dashboard.performance,
        icon: PieChart,
        description: 'Returns & allocation',
        permission: 'performance.view',
      },
      {
        label: 'Wallet',
        href: ROUTES.dashboard.wallet,
        icon: Wallet,
        description: 'Deposit & withdraw',
        permission: 'wallet.view',
      },
      {
        label: 'History',
        href: ROUTES.dashboard.transactions,
        icon: History,
        description: 'Activity timeline',
        permission: ['deposits.view', 'withdrawals.view'],
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'Notifications',
        href: ROUTES.dashboard.notifications,
        icon: Bell,
        permission: 'notifications.view',
      },
      {
        label: 'Support',
        href: ROUTES.dashboard.support,
        icon: LifeBuoy,
        permission: 'support.view',
      },
      {
        label: 'Profile',
        href: ROUTES.dashboard.settings.profile,
        icon: UserCog,
        permission: 'profile.view',
      },
      {
        label: 'Preferences',
        href: ROUTES.dashboard.settings.preferences,
        icon: Settings,
        permission: 'profile.view',
      },
      {
        label: 'Trade history',
        href: ROUTES.dashboard.trades,
        icon: CandlestickChart,
        matchNested: true,
        permission: 'trades.view',
      },
      {
        label: 'Referrals',
        href: ROUTES.dashboard.referrals,
        icon: Sparkles,
        badge: 'v1.1',
        permission: 'profile.view',
      },
    ],
  },
]

export const DASHBOARD_SETTINGS_NAV: NavItem[] = [
  {
    label: 'Profile hub',
    href: ROUTES.dashboard.settings.profile,
    icon: UserCog,
    description: 'Personal, bank, crypto, KYC, password, 2FA',
    permission: 'profile.view',
  },
  {
    label: 'Preferences',
    href: ROUTES.dashboard.settings.preferences,
    icon: SlidersHorizontal,
    description: 'Display Currency, theme and notifications',
    permission: 'profile.view',
  },
  {
    label: 'Security',
    href: ROUTES.dashboard.settings.security,
    icon: ShieldCheck,
    description: 'Password and active sessions',
    permission: 'sessions.manage',
  },
  {
    label: 'Payout methods',
    href: ROUTES.dashboard.settings.payoutMethods,
    icon: CreditCard,
    description: 'Where your withdrawals are sent',
    permission: 'withdrawals.view',
  },
]

/* -------------------------------------------------------------------------- */
/* Admin console                                                              */
/* -------------------------------------------------------------------------- */

export const ADMIN_NAV: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Overview', href: ROUTES.admin.root, icon: Gauge, permission: 'dashboard.view' },
      {
        label: 'System health',
        href: ROUTES.admin.systemHealth,
        icon: HeartPulse,
        permission: 'dashboard.view',
      },
      {
        label: 'Activity center',
        href: ROUTES.admin.activityCenter,
        icon: Activity,
        permission: 'activity.view',
      },
      { label: 'Search', href: ROUTES.admin.search, icon: Search, permission: 'users.view' },
      {
        label: 'Deposits',
        href: ROUTES.admin.deposits,
        icon: ArrowDownToLine,
        matchNested: true,
        permission: 'finance.review',
      },
      {
        label: 'Withdrawals',
        href: ROUTES.admin.withdrawals,
        icon: ArrowUpFromLine,
        matchNested: true,
        permission: 'finance.review',
      },
      {
        label: 'Users',
        href: ROUTES.admin.users,
        icon: Users,
        matchNested: true,
        permission: 'users.view',
      },
      {
        label: 'KYC queue',
        href: ROUTES.admin.kyc,
        icon: FileCheck2,
        matchNested: true,
        permission: 'kyc.review',
      },
      { label: 'Wallets', href: ROUTES.admin.wallets, icon: Wallet, permission: 'finance.adjust' },
      { label: 'Support', href: ROUTES.admin.support, icon: LifeBuoy, permission: 'support.view' },
    ],
  },
  {
    label: 'Trading desk',
    items: [
      {
        label: 'Trades',
        href: ROUTES.admin.trades,
        icon: CandlestickChart,
        matchNested: true,
        permission: 'trades.view',
      },
      {
        label: 'Daily return',
        href: ROUTES.admin.dailyReturn,
        icon: Wallet,
        matchNested: true,
        permission: 'returns.manage',
      },
      {
        label: 'Performance',
        href: ROUTES.admin.performance,
        icon: TrendingUp,
        permission: 'performance.view',
      },
      { label: 'Market ticker', href: ROUTES.admin.ticker, icon: Radio, permission: 'cms.manage' },
      {
        label: 'Reports',
        href: ROUTES.admin.reports,
        icon: ChartNoAxesCombined,
        permission: 'reports.view',
      },
    ],
  },
  {
    label: 'Growth & CMS',
    items: [
      {
        label: 'Frontend Management',
        href: ROUTES.admin.frontendManagement,
        icon: Monitor,
        permission: 'cms.view',
      },
      {
        label: 'Downloads / Reports',
        href: ROUTES.admin.downloads,
        icon: FileDown,
        permission: 'cms.view',
      },
      {
        label: 'Platform CMS',
        href: ROUTES.admin.cms.platform,
        icon: LayoutDashboard,
        permission: 'cms.view',
      },
      {
        label: 'Content CMS',
        href: ROUTES.admin.cms.content,
        icon: Newspaper,
        permission: 'cms.view',
      },
      { label: 'Media', href: ROUTES.admin.cms.media, icon: Sparkles, permission: 'media.manage' },
      {
        label: 'Site settings',
        href: ROUTES.admin.cms.site,
        icon: Settings,
        permission: 'cms.manage',
      },
      {
        label: 'Report library',
        href: ROUTES.admin.reportLibrary,
        icon: ChartNoAxesCombined,
        permission: 'reports.view',
      },
      {
        label: 'Live activity',
        href: ROUTES.admin.activity,
        icon: Activity,
        permission: 'cms.manage',
      },
      {
        label: 'Announcements',
        href: ROUTES.admin.announcements,
        icon: Megaphone,
        permission: 'cms.manage',
      },
      {
        label: 'Backup',
        href: ROUTES.admin.cms.backup,
        icon: FileClock,
        permission: 'settings.manage',
      },
    ],
  },
  {
    label: 'Communication',
    items: [
      {
        label: 'Broadcast',
        href: ROUTES.admin.broadcast,
        icon: Megaphone,
        permission: 'broadcasts.manage',
      },
      { label: 'Email outbox', href: ROUTES.admin.emails, icon: Inbox, permission: 'emails.manage' },
      {
        label: 'Email templates',
        href: ROUTES.admin.emailTemplates,
        icon: Mail,
        permission: 'emails.manage',
      },
    ],
  },
  {
    label: 'Governance',
    items: [
      {
        label: 'Feature toggles',
        href: ROUTES.admin.featureToggles,
        icon: ToggleLeft,
        permission: 'settings.manage',
      },
      { label: 'Audit log', href: ROUTES.admin.auditLog, icon: FileClock, permission: 'audit.view' },
      {
        label: 'Settings',
        href: ROUTES.admin.settings.global,
        icon: Settings,
        permission: 'settings.manage',
      },
    ],
  },
]

export const ADMIN_SETTINGS_NAV: NavItem[] = [
  {
    label: 'Global',
    href: ROUTES.admin.settings.global,
    icon: SlidersHorizontal,
    permission: 'settings.manage',
  },
  {
    label: 'General',
    href: ROUTES.admin.settings.general,
    icon: SlidersHorizontal,
    permission: 'settings.manage',
  },
  {
    label: 'Platform',
    href: ROUTES.admin.settings.platform,
    icon: Settings,
    permission: 'settings.manage',
  },
  {
    label: 'Security',
    href: ROUTES.admin.settings.security,
    icon: ShieldCheck,
    permission: 'settings.manage',
  },
  {
    label: 'Roles',
    href: ROUTES.admin.settings.roles,
    icon: BadgeCheck,
    badge: 'super-admin',
    permission: 'roles.view',
  },
  {
    label: 'Payment methods',
    href: ROUTES.admin.settings.paymentMethods,
    icon: CreditCard,
    badge: 'super-admin',
    permission: 'finance.manage',
  },
  {
    label: 'Staff',
    href: ROUTES.admin.settings.staff,
    icon: Users,
    badge: 'super-admin',
    permission: 'users.edit',
  },
  {
    label: 'Client Handover',
    href: ROUTES.admin.settings.handover,
    icon: AlertTriangle,
    badge: 'super-admin',
    permission: 'settings.handover',
  },
]

export const SUPPORT_LINK: NavItem = {
  label: 'Help & support',
  href: ROUTES.dashboard.support,
  icon: LifeBuoy,
}

export const LOGOUT_LINK: NavItem = {
  label: 'Logout',
  href: ROUTES.auth.login,
  icon: LogOut,
}

/** Sidebar highlighting. `matchNested` opts a section into matching its children. */
export function isRouteActive(pathname: string, item: Pick<NavItem, 'href' | 'matchNested'>) {
  if (pathname === item.href) return true
  return Boolean(item.matchNested) && pathname.startsWith(`${item.href}/`)
}
