import type { AdminUserAttributionFields } from '@/components/admin/admin-api-adapters'

export const ADMIN_ATTRIBUTION_NOT_REFERRED = 'Not referred'
export const ADMIN_ATTRIBUTION_NO_SALESMAN = 'No salesman'

export type AdminAttributionDisplay = {
  referredByLabel: string
  referralCodeLabel: string
  salesmanNameLabel: string
  salesmanCodeLabel: string
  referrerUserId: string | null
}

export function resolveAdminAttributionDisplay(
  fields: AdminUserAttributionFields | null | undefined,
): AdminAttributionDisplay {
  const referredBy = fields?.referral?.referredBy ?? null
  const salesman = fields?.salesman ?? null

  return {
    referredByLabel: referredBy?.name ?? ADMIN_ATTRIBUTION_NOT_REFERRED,
    referralCodeLabel: referredBy?.referralCode?.trim() ? referredBy.referralCode : '—',
    salesmanNameLabel: salesman?.name ?? ADMIN_ATTRIBUTION_NO_SALESMAN,
    salesmanCodeLabel: salesman?.code?.trim() ? salesman.code : '—',
    referrerUserId: referredBy?.id ?? null,
  }
}
