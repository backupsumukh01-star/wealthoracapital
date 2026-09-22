/**
 * Minimal permanent-deletion audit snapshot (AuditLog JSON).
 * Identity only — never balances, KYC docs, wallets, or secrets.
 */

export const PERMANENT_DELETE_AUDIT_ACTION = 'user.permanent_delete'
export const PERMANENT_DELETE_AUDIT_MODULE = 'users'
export const PERMANENT_DELETE_AUDIT_STATUS = 'COMPLETED' as const

export type PermanentDeleteIdentitySnapshot = {
  deletedUserId: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  username: string
  referralCode: string | null
  deletionRef: string
  deletedByAdminId: string
  deletedByName: string | null
  deletedByEmail: string | null
}

export type PermanentDeleteAuditNewValue = {
  status: typeof PERMANENT_DELETE_AUDIT_STATUS
  deleted: true
  deletionRef: string
}

const FORBIDDEN_SNAPSHOT_KEYS = [
  'balance',
  'wallet',
  'deposit',
  'withdrawal',
  'ledger',
  'password',
  'passwordHash',
  'twoFactor',
  'twoFactorSecret',
  'token',
  'refreshToken',
  'kycDocument',
  'storageKey',
] as const

export function buildPermanentDeleteSnapshot(input: {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    referralCode: string | null
  }
  actor: {
    id: string
    email: string
    firstName: string
    lastName: string
  } | null
  deletionRef: string
}): PermanentDeleteIdentitySnapshot {
  const displayName = `${input.user.firstName} ${input.user.lastName}`.trim()
  const username = input.user.email.split('@')[0] || input.user.email
  return {
    deletedUserId: input.user.id,
    email: input.user.email,
    firstName: input.user.firstName,
    lastName: input.user.lastName,
    displayName,
    username,
    referralCode: input.user.referralCode,
    deletionRef: input.deletionRef,
    deletedByAdminId: input.actor?.id ?? '',
    deletedByName: input.actor
      ? `${input.actor.firstName} ${input.actor.lastName}`.trim()
      : null,
    deletedByEmail: input.actor?.email ?? null,
  }
}

export function permanentDeleteAuditReason(snapshot: PermanentDeleteIdentitySnapshot): string {
  return `Permanently deleted ${snapshot.email} (${snapshot.displayName}) · ${snapshot.deletionRef}`
}

export function permanentDeleteAuditNewValue(
  deletionRef: string,
): PermanentDeleteAuditNewValue {
  return {
    status: PERMANENT_DELETE_AUDIT_STATUS,
    deleted: true,
    deletionRef,
  }
}

/** True when AuditLog row represents a successfully completed permanent deletion. */
export function isCompletedPermanentDeleteAudit(row: {
  action: string
  module: string
  newValue: unknown
}): boolean {
  if (row.action !== PERMANENT_DELETE_AUDIT_ACTION) return false
  if (row.module !== PERMANENT_DELETE_AUDIT_MODULE) return false
  if (!row.newValue || typeof row.newValue !== 'object' || Array.isArray(row.newValue)) {
    return false
  }
  const nv = row.newValue as Record<string, unknown>
  return nv.status === PERMANENT_DELETE_AUDIT_STATUS && nv.deleted === true
}

export function parsePermanentDeleteSnapshot(oldValue: unknown): PermanentDeleteIdentitySnapshot | null {
  if (!oldValue || typeof oldValue !== 'object' || Array.isArray(oldValue)) return null
  const o = oldValue as Record<string, unknown>
  if (typeof o.deletedUserId !== 'string' || typeof o.email !== 'string') return null
  if (typeof o.deletionRef !== 'string') return null
  return {
    deletedUserId: o.deletedUserId,
    email: o.email,
    firstName: typeof o.firstName === 'string' ? o.firstName : '',
    lastName: typeof o.lastName === 'string' ? o.lastName : '',
    displayName:
      typeof o.displayName === 'string'
        ? o.displayName
        : `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim(),
    username: typeof o.username === 'string' ? o.username : o.email.split('@')[0] || o.email,
    referralCode: typeof o.referralCode === 'string' ? o.referralCode : null,
    deletionRef: o.deletionRef,
    deletedByAdminId: typeof o.deletedByAdminId === 'string' ? o.deletedByAdminId : '',
    deletedByName: typeof o.deletedByName === 'string' ? o.deletedByName : null,
    deletedByEmail: typeof o.deletedByEmail === 'string' ? o.deletedByEmail : null,
  }
}

/** Guard for tests / reviewers — snapshot must stay identity-only. */
export function snapshotContainsForbiddenKeys(snapshot: Record<string, unknown>): string[] {
  const keys = Object.keys(snapshot)
  return FORBIDDEN_SNAPSHOT_KEYS.filter((forbidden) =>
    keys.some((k) => k.toLowerCase().includes(forbidden.toLowerCase())),
  )
}
