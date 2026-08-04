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
  ],
  SUPPORT: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
    PERMISSIONS['users.edit'],
    PERMISSIONS['users.suspend'],
    PERMISSIONS['activity.view'],
    PERMISSIONS['profile.view'],
    PERMISSIONS['profile.edit'],
    PERMISSIONS['sessions.manage'],
    PERMISSIONS['kyc.view'],
  ],
  KYC: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
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
  ],
  VIEWER: [
    PERMISSIONS['dashboard.view'],
    PERMISSIONS['users.view'],
    PERMISSIONS['audit.view'],
    PERMISSIONS['activity.view'],
    PERMISSIONS['profile.view'],
    PERMISSIONS['sessions.manage'],
    PERMISSIONS['kyc.view'],
  ],
}

const INVESTOR_PERMISSIONS: Permission[] = [
  PERMISSIONS['profile.view'],
  PERMISSIONS['profile.edit'],
  PERMISSIONS['sessions.manage'],
  PERMISSIONS['kyc.view'],
  PERMISSIONS['kyc.submit'],
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

  if (input.staffRole) {
    return [...STAFF_PERMISSION_MAP[input.staffRole]]
  }

  return [...INVESTOR_PERMISSIONS]
}

export function hasPermission(
  input: { role: Role; staffRole: StaffRole | null },
  permission: Permission,
): boolean {
  return resolvePermissions(input).includes(permission)
}

export function isStaffUser(input: { role: Role; staffRole: StaffRole | null }): boolean {
  return input.role === 'ADMIN' || input.role === 'SUPER_ADMIN' || input.staffRole !== null
}

export function listRoleCatalog() {
  return [
    { roleKey: 'SUPER_ADMIN', label: 'Super Admin', permissions: STAFF_PERMISSION_MAP.SUPER_ADMIN },
    { roleKey: 'ADMIN', label: 'Admin', permissions: STAFF_PERMISSION_MAP.ADMIN },
    { roleKey: 'FINANCE', label: 'Finance', permissions: STAFF_PERMISSION_MAP.FINANCE },
    { roleKey: 'SUPPORT', label: 'Support', permissions: STAFF_PERMISSION_MAP.SUPPORT },
    { roleKey: 'KYC', label: 'KYC', permissions: STAFF_PERMISSION_MAP.KYC },
    { roleKey: 'CONTENT', label: 'Content', permissions: STAFF_PERMISSION_MAP.CONTENT },
    { roleKey: 'VIEWER', label: 'Viewer', permissions: STAFF_PERMISSION_MAP.VIEWER },
    { roleKey: 'INVESTOR', label: 'Investor', permissions: INVESTOR_PERMISSIONS },
  ]
}
