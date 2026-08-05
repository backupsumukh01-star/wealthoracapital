/**
 * Store facades — business state lives in APIs and React Query.
 *
 * Separation:
 * - UI state: modals, filters, command palette (component-local / URL)
 * - Business state: session, wallet, CMS publish, queues → services + React Query
 */

export const STORE_KEYS = {
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
