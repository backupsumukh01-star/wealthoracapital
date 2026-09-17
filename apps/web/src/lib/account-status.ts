/**
 * Account status UX — badge, description, next action.
 * Derived from lifecycle account + money pending flags (docs/06 + product flow).
 */

import { ROUTES } from '@meridian/shared'

import type { InvestorAccount, MoneyDeposit, MoneyWithdrawal } from '@/lib/investor-lifecycle'

export type AccountUxStatus =
  | 'EMAIL_PENDING'
  | 'KYC_REQUIRED'
  | 'KYC_UNDER_REVIEW'
  | 'KYC_REJECTED'
  | 'KYC_APPROVED'
  | 'DEPOSIT_PENDING'
  | 'WITHDRAWAL_PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'

export type AccountStatusInfo = {
  id: AccountUxStatus
  label: string
  description: string
  nextActionLabel: string
  nextActionHref: string
  tone: 'warning' | 'info' | 'profit' | 'loss' | 'neutral'
  /** Hide deposit / withdraw until true */
  canTransact: boolean
  /** Show full wealth dashboard */
  showFullDashboard: boolean
}

export function resolveAccountStatus(
  account: InvestorAccount | null | undefined,
  deposits: MoneyDeposit[] = [],
  withdrawals: MoneyWithdrawal[] = [],
): AccountStatusInfo {
  if (!account) {
    return {
      id: 'EMAIL_PENDING',
      label: 'Sign in required',
      description: 'Sign in to view your Wealthora account.',
      nextActionLabel: 'Login',
      nextActionHref: ROUTES.auth.login,
      tone: 'neutral',
      canTransact: false,
      showFullDashboard: false,
    }
  }

  if (account.status === 'SUSPENDED') {
    return {
      id: 'SUSPENDED',
      label: 'Suspended',
      description: 'This account is suspended. Contact support for help.',
      nextActionLabel: 'Contact support',
      nextActionHref: ROUTES.dashboard.support,
      tone: 'loss',
      canTransact: false,
      showFullDashboard: false,
    }
  }

  if (!account.emailVerified || account.status === 'PENDING_EMAIL') {
    return {
      id: 'EMAIL_PENDING',
      label: 'Email verification pending',
      description: 'Verify your email with the 6-digit code to continue onboarding.',
      nextActionLabel: 'Verify email',
      nextActionHref: `${ROUTES.auth.verifyEmail}?email=${encodeURIComponent(account.email)}`,
      tone: 'warning',
      canTransact: false,
      showFullDashboard: false,
    }
  }

  if (account.kycStatus === 'REJECTED' || account.status === 'REJECTED') {
    return {
      id: 'KYC_REJECTED',
      label: 'KYC rejected',
      description:
        account.kyc?.rejectionReason ??
        'Your documents need attention. Re-upload to continue.',
      nextActionLabel: 'Re-submit KYC',
      nextActionHref: ROUTES.auth.onboarding,
      tone: 'loss',
      canTransact: false,
      showFullDashboard: false,
    }
  }

  if (account.kycStatus === 'UNDER_REVIEW') {
    return {
      id: 'KYC_UNDER_REVIEW',
      label: 'KYC under review',
      description: 'Compliance is reviewing your documents. Expected: 24–48 hours.',
      nextActionLabel: 'View status',
      nextActionHref: ROUTES.dashboard.settings.profile,
      tone: 'warning',
      canTransact: false,
      showFullDashboard: true,
    }
  }

  if (account.kycStatus === 'NOT_STARTED' || account.status === 'PENDING_KYC') {
    return {
      id: 'KYC_REQUIRED',
      label: 'KYC required',
      description: 'Complete identity verification before you can deposit or withdraw.',
      nextActionLabel: 'Complete KYC',
      nextActionHref: ROUTES.auth.onboarding,
      tone: 'info',
      canTransact: false,
      showFullDashboard: true,
    }
  }

  const uid = account.userId
  const pendingDep = deposits.some(
    (d) =>
      d.userId === uid &&
      (d.status === 'PENDING' || d.status === 'UNDER_REVIEW' || d.status === 'NEED_INFO'),
  )
  const pendingWdr = withdrawals.some(
    (w) => w.userId === uid && (w.status === 'PENDING' || w.status === 'APPROVED'),
  )

  if (pendingDep) {
    return {
      id: 'DEPOSIT_PENDING',
      label: 'Deposit pending',
      description: 'Your deposit is in the review queue. Funds credit after approval.',
      nextActionLabel: 'View wallet',
      nextActionHref: ROUTES.dashboard.wallet,
      tone: 'warning',
      canTransact: true,
      showFullDashboard: true,
    }
  }

  if (pendingWdr) {
    return {
      id: 'WITHDRAWAL_PENDING',
      label: 'Withdrawal pending',
      description: 'A withdrawal is awaiting compliance or payout.',
      nextActionLabel: 'View wallet',
      nextActionHref: ROUTES.dashboard.wallet,
      tone: 'info',
      canTransact: true,
      showFullDashboard: true,
    }
  }

  if (account.kycStatus === 'APPROVED' && account.status === 'VERIFIED') {
    const bal = Number(account.wallet?.availableBalance ?? '0')
    if (bal <= 0) {
      return {
        id: 'KYC_APPROVED',
        label: 'Verified · ready to deposit',
        description: 'Your account is verified. Make your first deposit to start investing.',
        nextActionLabel: 'Deposit funds',
        nextActionHref: `${ROUTES.dashboard.wallet}?action=deposit`,
        tone: 'profit',
        canTransact: true,
        showFullDashboard: true,
      }
    }
    return {
      id: 'ACTIVE',
      label: 'Active',
      description: 'Your Wealthora account is fully active.',
      nextActionLabel: 'Open wallet',
      nextActionHref: ROUTES.dashboard.wallet,
      tone: 'profit',
      canTransact: true,
      showFullDashboard: true,
    }
  }

  return {
    id: 'KYC_REQUIRED',
    label: 'Complete setup',
    description: 'Finish verification to unlock your wallet.',
    nextActionLabel: 'Continue',
    nextActionHref: ROUTES.auth.onboarding,
    tone: 'info',
    canTransact: false,
    showFullDashboard: true,
  }
}
