/**
 * Minimal UI adapters from production API / shared types → admin pill & row shapes.
 */
import type {
  Deposit,
  DepositStatus,
  KycStatus,
  User,
  UserStatus,
  Withdrawal,
  WithdrawalStatus,
} from '@meridian/shared'

import type {
  AdminAccountStatus,
  AdminDepositStatus,
  AdminKycStatus,
  AdminWithdrawalStatus,
} from '@/components/admin/admin-ui-types'

export type {
  AdminAccountStatus,
  AdminDepositStatus,
  AdminKycStatus,
  AdminTradeDirection,
  AdminWithdrawalStatus,
} from '@/components/admin/admin-ui-types'

export type AdminUserRef = {
  id: string
  email: string
  firstName: string
  lastName: string
  kycStatus?: KycStatus
}

export type AdminDepositRow = Deposit & {
  user?: AdminUserRef
}

export type AdminWithdrawalRow = Withdrawal & {
  user?: AdminUserRef
}

export function investorName(
  user?: Pick<AdminUserRef, 'firstName' | 'lastName' | 'id' | 'email'> | null,
  fallback = '—',
) {
  if (!user) return fallback
  const name = `${user.firstName} ${user.lastName}`.trim()
  return name || user.email || user.id || fallback
}

export function mapKycStatus(status: KycStatus | string): AdminKycStatus {
  switch (status) {
    case 'NOT_STARTED':
      return 'NOT_STARTED'
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
    case 'EXPIRED':
    case 'SUSPENDED':
      return 'REJECTED'
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'NEED_MORE_INFO':
      return 'UNDER_REVIEW'
    default:
      return 'NOT_STARTED'
  }
}

export function mapAccountStatus(
  status: UserStatus | string,
  kycStatus: KycStatus | string,
): AdminAccountStatus {
  switch (status) {
    case 'PENDING_VERIFICATION':
      return 'PENDING_EMAIL'
    case 'ACTIVE':
      return kycStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING_KYC'
    case 'SUSPENDED':
      return 'SUSPENDED'
    case 'BLOCKED':
      return 'RESTRICTED'
    case 'CLOSED':
    case 'ARCHIVED':
      return 'REJECTED'
    default:
      return 'PENDING_KYC'
  }
}

export function mapDepositStatus(status: DepositStatus | string): AdminDepositStatus {
  switch (status) {
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'APPROVED':
    case 'REJECTED':
    case 'NEED_INFO':
      return status
    case 'CANCELLED':
    case 'EXPIRED':
      return 'REJECTED'
    default:
      return 'PENDING'
  }
}

export function mapWithdrawalStatus(status: WithdrawalStatus | string): AdminWithdrawalStatus {
  switch (status) {
    case 'PENDING':
    case 'APPROVED':
    case 'REJECTED':
    case 'PAID':
      return status
    case 'UNDER_REVIEW':
      return 'PENDING'
    case 'PROCESSING':
      return 'APPROVED'
    case 'COMPLETED':
      return 'PAID'
    case 'CANCELLED':
      return 'REJECTED'
    default:
      return 'PENDING'
  }
}

export function methodLabel(method: Deposit['method'] | string | null | undefined) {
  if (!method) return '—'
  if (typeof method === 'string') return method
  return method.name || method.type || '—'
}

export function userInitials(user: Pick<User, 'firstName' | 'lastName'>) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || '?'
}
