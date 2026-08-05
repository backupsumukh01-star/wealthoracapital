import type { KycStatus } from '@meridian/shared'
import { ROUTES } from '@meridian/shared'

/** Gate deposits/withdrawals on API KYC status (not localStorage). */
export function canTransact(kycStatus: KycStatus | string | undefined | null): boolean {
  return kycStatus === 'APPROVED'
}

export function accountAccessMessage(kycStatus: KycStatus | string | undefined | null): {
  label: string
  description: string
  nextActionLabel: string
  nextActionHref: string
} {
  switch (kycStatus) {
    case 'APPROVED':
      return {
        label: 'Verified',
        description: 'Your account can deposit and withdraw.',
        nextActionLabel: 'Deposit',
        nextActionHref: ROUTES.dashboard.wallet,
      }
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
      return {
        label: 'KYC under review',
        description: 'Deposits unlock after compliance approval.',
        nextActionLabel: 'View status',
        nextActionHref: ROUTES.auth.onboarding,
      }
    case 'REJECTED':
    case 'NEED_MORE_INFO':
      return {
        label: 'KYC action needed',
        description: 'Update your documents to continue.',
        nextActionLabel: 'Continue KYC',
        nextActionHref: ROUTES.auth.onboarding,
      }
    default:
      return {
        label: 'Complete KYC',
        description: 'Verify your identity before depositing.',
        nextActionLabel: 'Start KYC',
        nextActionHref: ROUTES.auth.onboarding,
      }
  }
}
