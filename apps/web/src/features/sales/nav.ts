import {
  BarChart3,
  GitBranch,
  LayoutDashboard,
  Link2,
  LogOut,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ROUTES } from '@meridian/shared'

export type SalesNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const SALESMAN_NAV: SalesNavItem[] = [
  { href: ROUTES.sales.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.sales.network, label: 'My Network', icon: GitBranch },
  { href: ROUTES.sales.customers, label: 'Customers', icon: Users },
  { href: ROUTES.sales.investments, label: 'Investments', icon: TrendingUp },
  { href: ROUTES.sales.performance, label: 'Performance', icon: BarChart3 },
  { href: ROUTES.sales.referral, label: 'My Referral Link', icon: Link2 },
  { href: ROUTES.sales.profile, label: 'Profile', icon: UserRound },
]

export const SALES_LOGOUT_ITEM: SalesNavItem = {
  href: ROUTES.sales.login,
  label: 'Logout',
  icon: LogOut,
}

export type SalesOwnerNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const SALES_OWNER_NAV: SalesOwnerNavItem[] = [
  { href: ROUTES.sales.owner.root, label: 'Sales Dashboard', icon: LayoutDashboard },
  { href: ROUTES.sales.owner.salesmen, label: 'Salesmen', icon: Users },
  { href: ROUTES.sales.owner.networks, label: 'Networks', icon: GitBranch },
  { href: ROUTES.sales.owner.reports, label: 'Reports', icon: BarChart3 },
]

export function isSalesNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href === ROUTES.sales.dashboard) return pathname === ROUTES.sales.root
  if (href === ROUTES.sales.owner.root) {
    return pathname === ROUTES.sales.owner.root
  }
  if (href === ROUTES.sales.customers) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  if (href === ROUTES.sales.owner.salesmen) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  return pathname.startsWith(`${href}/`)
}
