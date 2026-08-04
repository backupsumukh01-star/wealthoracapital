import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Bell,
  CandlestickChart,
  ChartNoAxesCombined,
  CreditCard,
  FileClock,
  FileCheck2,
  Gauge,
  HeartPulse,
  History,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  type LucideIcon,
  LogOut,
  Mail,
  Megaphone,
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
    label: 'Historical Results',
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
      },
      {
        label: 'Portfolio',
        href: ROUTES.dashboard.performance,
        icon: PieChart,
        description: 'Returns & allocation',
      },
      {
        label: 'Wallet',
        href: ROUTES.dashboard.wallet,
        icon: Wallet,
        description: 'Deposit & withdraw',
      },
      {
        label: 'History',
        href: ROUTES.dashboard.transactions,
        icon: History,
        description: 'Activity timeline',
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
      },
      {
        label: 'Support',
        href: ROUTES.dashboard.support,
        icon: LifeBuoy,
      },
      {
        label: 'Profile',
        href: ROUTES.dashboard.settings.profile,
        icon: UserCog,
      },
      {
        label: 'Settings',
        href: ROUTES.dashboard.settings.preferences,
        icon: Settings,
      },
      {
        label: 'Trade history',
        href: ROUTES.dashboard.trades,
        icon: CandlestickChart,
        matchNested: true,
      },
      {
        label: 'Referrals',
        href: ROUTES.dashboard.referrals,
        icon: Sparkles,
        badge: 'v1.1',
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
  },
  {
    label: 'Security',
    href: ROUTES.dashboard.settings.security,
    icon: ShieldCheck,
    description: 'Password and active sessions',
  },
  {
    label: 'Payout methods',
    href: ROUTES.dashboard.settings.payoutMethods,
    icon: CreditCard,
    description: 'Where your withdrawals are sent',
  },
  {
    label: 'Preferences',
    href: ROUTES.dashboard.settings.preferences,
    icon: SlidersHorizontal,
    description: 'Notifications, theme and number format',
  },
  {
    label: 'Email preview',
    href: ROUTES.dashboard.settings.emails,
    icon: Mail,
    description: 'Lifecycle email templates',
  },
]

/* -------------------------------------------------------------------------- */
/* Admin console                                                              */
/* -------------------------------------------------------------------------- */

export const ADMIN_NAV: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Overview', href: ROUTES.admin.root, icon: Gauge },
      { label: 'System health', href: ROUTES.admin.systemHealth, icon: HeartPulse },
      { label: 'Activity center', href: ROUTES.admin.activityCenter, icon: Activity },
      { label: 'Search', href: ROUTES.admin.search, icon: Search },
      {
        label: 'Deposits',
        href: ROUTES.admin.deposits,
        icon: ArrowDownToLine,
        matchNested: true,
      },
      {
        label: 'Withdrawals',
        href: ROUTES.admin.withdrawals,
        icon: ArrowUpFromLine,
        matchNested: true,
      },
      { label: 'Users', href: ROUTES.admin.users, icon: Users, matchNested: true },
      { label: 'KYC queue', href: ROUTES.admin.kyc, icon: FileCheck2, matchNested: true },
      { label: 'Wallets', href: ROUTES.admin.wallets, icon: Wallet },
      { label: 'Support', href: ROUTES.admin.support, icon: LifeBuoy },
    ],
  },
  {
    label: 'Trading desk',
    items: [
      { label: 'Trades', href: ROUTES.admin.trades, icon: CandlestickChart, matchNested: true },
      { label: 'Daily return', href: ROUTES.admin.dailyReturn, icon: Wallet, matchNested: true },
      { label: 'Performance', href: ROUTES.admin.performance, icon: TrendingUp },
      { label: 'Market ticker', href: ROUTES.admin.ticker, icon: Radio },
      { label: 'Reports', href: ROUTES.admin.reports, icon: ChartNoAxesCombined },
    ],
  },
  {
    label: 'Growth & CMS',
    items: [
      { label: 'Landing CMS', href: ROUTES.admin.cms.landing, icon: LayoutTemplate },
      { label: 'Platform CMS', href: ROUTES.admin.cms.platform, icon: LayoutDashboard },
      { label: 'Content CMS', href: ROUTES.admin.cms.content, icon: Newspaper },
      { label: 'Media', href: ROUTES.admin.cms.media, icon: Sparkles },
      { label: 'Site settings', href: ROUTES.admin.cms.site, icon: Settings },
      { label: 'Report library', href: ROUTES.admin.reportLibrary, icon: ChartNoAxesCombined },
      { label: 'Live activity', href: ROUTES.admin.activity, icon: Activity },
      { label: 'Announcements', href: ROUTES.admin.announcements, icon: Megaphone },
      { label: 'Backup', href: ROUTES.admin.cms.backup, icon: FileClock },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Notifications', href: ROUTES.admin.notifications, icon: Bell },
      { label: 'Broadcast', href: ROUTES.admin.broadcast, icon: Megaphone },
      { label: 'Email outbox', href: ROUTES.admin.emails, icon: Inbox },
      { label: 'Email templates', href: ROUTES.admin.emailTemplates, icon: Mail },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Feature toggles', href: ROUTES.admin.featureToggles, icon: ToggleLeft },
      { label: 'Audit log', href: ROUTES.admin.auditLog, icon: FileClock },
      { label: 'Settings', href: ROUTES.admin.settings.global, icon: Settings },
    ],
  },
]

export const ADMIN_SETTINGS_NAV: NavItem[] = [
  { label: 'Global', href: ROUTES.admin.settings.global, icon: SlidersHorizontal },
  { label: 'General', href: ROUTES.admin.settings.general, icon: SlidersHorizontal },
  { label: 'Platform', href: ROUTES.admin.settings.platform, icon: Settings },
  { label: 'Email', href: ROUTES.admin.settings.emailTemplates, icon: Mail },
  { label: 'Security', href: ROUTES.admin.settings.security, icon: ShieldCheck },
  { label: 'Roles', href: ROUTES.admin.settings.roles, icon: BadgeCheck, badge: 'super-admin' },
  {
    label: 'Payment methods',
    href: ROUTES.admin.settings.paymentMethods,
    icon: CreditCard,
    badge: 'super-admin',
  },
  { label: 'Staff', href: ROUTES.admin.settings.staff, icon: Users, badge: 'super-admin' },
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
