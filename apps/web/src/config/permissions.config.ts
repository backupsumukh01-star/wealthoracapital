import { StaffRole } from '@meridian/shared'

/** Permission flags aligned with Admin OS role matrix / backend RBAC. */
export const PERMISSIONS = [
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
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  FINANCE_MANAGER: 'Finance Manager',
  COMPLIANCE_KYC: 'Compliance (KYC)',
  TRADING_MANAGER: 'Trading Manager',
  SUPPORT_AGENT: 'Support Agent',
  CONTENT_MANAGER: 'Content Manager',
  VIEWER: 'Viewer',
}
