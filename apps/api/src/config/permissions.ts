import type { Role, StaffRole } from '@prisma/client'

/**
 * Fine-grained permissions for admin/investor surfaces.
 * StaffRole → permission sets. SUPER_ADMIN (role or staff) receives all.
 */
export const PERMISSIONS = {
  'dashboard.view': 'dashboard.view',
  'users.view': 'users.view',
  'users.edit': 'users.edit',
  'users.suspend': 'users.suspend',
  'users.delete': 'users.delete',
  'users.restore': 'users.restore',
  'audit.view': 'audit.view',
  'activity.view': 'activity.view',
  'roles.view': 'roles.view',
  'profile.view': 'profile.view',
  'profile.edit': 'profile.edit',
  'sessions.manage': 'sessions.manage',
  'kyc.view': 'kyc.view',
  'kyc.submit': 'kyc.submit',
  'kyc.review': 'kyc.review',
  'wallet.view': 'wallet.view',
  'deposits.view': 'deposits.view',
  'deposits.create': 'deposits.create',
  'withdrawals.view': 'withdrawals.view',
  'withdrawals.create': 'withdrawals.create',
  'finance.view': 'finance.view',
  'finance.review': 'finance.review',
  'finance.manage': 'finance.manage',
  'finance.adjust': 'finance.adjust',
  'trades.view': 'trades.view',
  'trades.manage': 'trades.manage',
  'performance.view': 'performance.view',
  'returns.manage': 'returns.manage',
  'cms.view': 'cms.view',
  'cms.manage': 'cms.manage',
  'media.manage': 'media.manage',
  'emails.manage': 'emails.manage',
  'support.view': 'support.view',
  'support.manage': 'support.manage',
  'reports.view': 'reports.view',
  'reports.manage': 'reports.manage',
  'broadcasts.manage': 'broadcasts.manage',
  'settings.manage': 'settings.manage',
  'notifications.view': 'notifications.view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const ALL_PERMISSIONS = Object.values(PERMISSIONS)

const STAFF_PERMISSION_MAP: Record<StaffRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS,
  FINANCE: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
    PERMISSIONS['audit.view'],
    PERMISSIONS['activity.view'],
    PERMISSIONS['profile.view'],
    PERMISSIONS['profile.edit'],
    PERMISSIONS['sessions.manage'],
    PERMISSIONS['kyc.view'],
    PERMISSIONS['finance.view'],
    PERMISSIONS['finance.review'],
    PERMISSIONS['finance.manage'],
    PERMISSIONS['finance.adjust'],
    PERMISSIONS['trades.view'],
    PERMISSIONS['performance.view'],
    PERMISSIONS['returns.manage'],
    PERMISSIONS['reports.view'],
    PERMISSIONS['reports.manage'],
    PERMISSIONS['notifications.view'],
  ],
  SUPPORT: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
    PERMISSIONS['users.edit'],
    PERMISSIONS['activity.view'],
    PERMISSIONS['profile.view'],
    PERMISSIONS['profile.edit'],
    PERMISSIONS['sessions.manage'],
    PERMISSIONS['kyc.view'],
    PERMISSIONS['support.view'],
    PERMISSIONS['support.manage'],
    PERMISSIONS['emails.manage'],
    PERMISSIONS['notifications.view'],
    PERMISSIONS['broadcasts.manage'],
  ],
  KYC: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
    // Profile-field edits only; role/staffRole changes are Super-Admin gated in service.
    PERMISSIONS['users.edit'],
    PERMISSIONS['activity.view'],
    PERMISSIONS['profile.view'],
    PERMISSIONS['profile.edit'],
    PERMISSIONS['sessions.manage'],
    PERMISSIONS['kyc.view'],
    PERMISSIONS['kyc.review'],
  ],
  CONTENT: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
    PERMISSIONS['activity.view'],
    PERMISSIONS['profile.view'],
    PERMISSIONS['profile.edit'],
    PERMISSIONS['sessions.manage'],
    PERMISSIONS['cms.view'],
    PERMISSIONS['cms.manage'],
    PERMISSIONS['media.manage'],
    PERMISSIONS['emails.manage'],
    PERMISSIONS['broadcasts.manage'],
    PERMISSIONS['notifications.view'],
  ],
  VIEWER: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
    PERMISSIONS['audit.view'],
    PERMISSIONS['activity.view'],
    PERMISSIONS['profile.view'],
    PERMISSIONS['sessions.manage'],
    PERMISSIONS['kyc.view'],
    PERMISSIONS['finance.view'],
    PERMISSIONS['trades.view'],
    PERMISSIONS['performance.view'],
    PERMISSIONS['cms.view'],
    PERMISSIONS['support.view'],
    PERMISSIONS['reports.view'],
    PERMISSIONS['notifications.view'],
  ],
}

const INVESTOR_PERMISSIONS: Permission[] = [
  PERMISSIONS['profile.view'],
  PERMISSIONS['profile.edit'],
  PERMISSIONS['sessions.manage'],
  PERMISSIONS['kyc.view'],
  PERMISSIONS['kyc.submit'],
  PERMISSIONS['wallet.view'],
  PERMISSIONS['deposits.view'],
  PERMISSIONS['deposits.create'],
  PERMISSIONS['withdrawals.view'],
  PERMISSIONS['withdrawals.create'],
  PERMISSIONS['trades.view'],
  PERMISSIONS['performance.view'],
  PERMISSIONS['support.view'],
  PERMISSIONS['reports.view'],
  PERMISSIONS['notifications.view'],
]

export function resolvePermissions(input: {
  role: Role
  staffRole: StaffRole | null
}): Permission[] {
  if (input.role === 'SUPER_ADMIN') {
    return [...ALL_PERMISSIONS]
  }

  if (input.role === 'ADMIN') {
    if (input.staffRole) {
      return [...new Set([...STAFF_PERMISSION_MAP[input.staffRole], ...STAFF_PERMISSION_MAP.ADMIN])]
    }
    return [...STAFF_PERMISSION_MAP.ADMIN]
  }

  // Never grant staff permission maps to investors — even if staffRole is set erroneously.
  return [...INVESTOR_PERMISSIONS]
}

export function hasPermission(
  input: { role: Role; staffRole: StaffRole | null },
  permission: Permission,
): boolean {
  return resolvePermissions(input).includes(permission)
}

export function isStaffUser(input: { role: Role; staffRole: StaffRole | null }): boolean {
  // Staff console requires an admin role. staffRole only scopes permissions within staff —
  // a USER with a stray staffRole must never gain admin routes.
  return input.role === 'ADMIN' || input.role === 'SUPER_ADMIN'
}

export function listRoleCatalog() {
  return [
    { roleKey: 'SUPER_ADMIN', label: 'Super Admin', permissions: STAFF_PERMISSION_MAP.SUPER_ADMIN },
    { roleKey: 'ADMIN', label: 'Admin', permissions: STAFF_PERMISSION_MAP.ADMIN },
    { roleKey: 'FINANCE', label: 'Finance', permissions: STAFF_PERMISSION_MAP.FINANCE },
    { roleKey: 'SUPPORT', label: 'Support', permissions: STAFF_PERMISSION_MAP.SUPPORT },
    { roleKey: 'KYC', label: 'KYC / Compliance', permissions: STAFF_PERMISSION_MAP.KYC },
    { roleKey: 'CONTENT', label: 'Content', permissions: STAFF_PERMISSION_MAP.CONTENT },
    { roleKey: 'VIEWER', label: 'Viewer', permissions: STAFF_PERMISSION_MAP.VIEWER },
    { roleKey: 'INVESTOR', label: 'Investor', permissions: INVESTOR_PERMISSIONS },
  ]
}

/** Flat matrix for docs / admin UI: permission → roleKey → boolean */
export function buildPermissionMatrix(): {
  permissions: Permission[]
  roles: Array<{ roleKey: string; label: string }>
  matrix: Record<string, Record<string, boolean>>
} {
  const catalog = listRoleCatalog()
  const permissions = [...ALL_PERMISSIONS]
  const matrix: Record<string, Record<string, boolean>> = {}
  for (const perm of permissions) {
    matrix[perm] = {}
    for (const role of catalog) {
      matrix[perm]![role.roleKey] = role.permissions.includes(perm)
    }
  }
  return {
    permissions,
    roles: catalog.map((r) => ({ roleKey: r.roleKey, label: r.label })),
    matrix,
  }
}

export { STAFF_PERMISSION_MAP, INVESTOR_PERMISSIONS, ALL_PERMISSIONS }
