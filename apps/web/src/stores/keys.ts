/**
 * Store facades — business state lives in providers today (demo).
 * When the API is live, React Query + these facades replace localStorage stores.
 *
 * Separation:
 * - UI state: modals, filters, command palette (component-local / URL)
 * - Business state: session, wallet, CMS publish, queues → services + React Query
 */

export const STORE_KEYS = {
  investorLifecycle: 'growzy_investor_lifecycle_v2',
  adminOs: 'growzy_admin_os_v4',
  notifications: 'growzy_notifications_v2',
} as const

/** Integration checklist for each domain store. */
export const STORE_API_MAP = {
  session: 'authService.me',
  wallet: 'walletService.summary',
  deposits: 'depositService.list',
  withdrawals: 'withdrawService.list',
  trades: 'tradeService.list',
  notifications: 'notificationService.list',
  cms: 'cmsService.publicBootstrap',
  adminOs: 'adminService + cmsService + settingsService',
} as const
