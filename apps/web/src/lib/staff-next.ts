import { ROUTES } from '@meridian/shared'

/** Safe post-login path for Admin / Sales Owner Google sign-in. */
export function safeStaffNext(raw: string | null | undefined): string {
  if (!raw || raw === 'admin') return ROUTES.admin.root
  if (!raw.startsWith('/') || raw.startsWith('//')) return ROUTES.admin.root
  if (raw.startsWith(ROUTES.sales.owner.root)) return raw
  if (raw.startsWith(ROUTES.admin.root)) return raw
  return ROUTES.admin.root
}

export function isSalesOwnerNext(raw: string | null | undefined): boolean {
  return safeStaffNext(raw).startsWith(ROUTES.sales.owner.root)
}

/** True only when Google was started from Admin / Sales Owner, not investor login. */
export function isStaffOauthNext(raw: string | null | undefined): boolean {
  if (!raw) return false
  if (raw === 'admin') return true
  return raw.startsWith(ROUTES.admin.root) || raw.startsWith(ROUTES.sales.owner.root)
}
