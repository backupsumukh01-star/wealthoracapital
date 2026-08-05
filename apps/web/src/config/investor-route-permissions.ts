import type { Permission } from '@/config/permissions.config'
import { ROUTES } from '@meridian/shared'

/**
 * Longest-prefix match: investor dashboard pathname → required permission(s).
 */
export const INVESTOR_ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  [ROUTES.dashboard.root]: 'performance.view',
  [ROUTES.dashboard.performance]: 'performance.view',
  [ROUTES.dashboard.wallet]: 'wallet.view',
  [ROUTES.dashboard.deposit]: 'deposits.create',
  [ROUTES.dashboard.withdraw]: 'withdrawals.create',
  [ROUTES.dashboard.transactions]: ['deposits.view', 'withdrawals.view'],
  [ROUTES.dashboard.trades]: 'trades.view',
  [ROUTES.dashboard.notifications]: 'notifications.view',
  [ROUTES.dashboard.support]: 'support.view',
  [ROUTES.dashboard.settings.profile]: 'profile.view',
  [ROUTES.dashboard.settings.security]: 'sessions.manage',
  [ROUTES.dashboard.settings.payoutMethods]: 'withdrawals.view',
  [ROUTES.dashboard.settings.preferences]: 'profile.view',
  [ROUTES.dashboard.settings.emails]: 'profile.view',
  [ROUTES.dashboard.referrals]: 'profile.view',
}
