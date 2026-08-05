/**
 * Permission flags — must match `apps/api/src/config/permissions.ts` exactly.
 */
export const PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.edit',
  'users.suspend',
  'users.delete',
  'users.restore',
  'audit.view',
  'activity.view',
  'roles.view',
  'profile.view',
  'profile.edit',
  'sessions.manage',
  'kyc.view',
  'kyc.submit',
  'kyc.review',
  'wallet.view',
  'deposits.view',
  'deposits.create',
  'withdrawals.view',
  'withdrawals.create',
  'finance.view',
  'finance.review',
  'finance.manage',
  'finance.adjust',
  'trades.view',
  'trades.manage',
  'performance.view',
  'returns.manage',
  'cms.view',
  'cms.manage',
  'media.manage',
  'emails.manage',
  'support.view',
  'support.manage',
  'reports.view',
  'reports.manage',
  'broadcasts.manage',
  'settings.manage',
  'notifications.view',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}

export const STAFF_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  SUPPORT: 'Support',
  KYC: 'KYC / Compliance',
  CONTENT: 'Content',
  VIEWER: 'Viewer',
}
