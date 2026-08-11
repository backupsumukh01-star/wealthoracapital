import { API_ROUTES, type MoneyString } from '@meridian/shared'

import { apiClient } from './http'

export type ReferralRewardStatus = 'LOCKED' | 'AVAILABLE' | 'REDEEMED' | 'CANCELLED'

export type ReferralSummary = {
  referralEnabled: boolean
  referralEligible: boolean
  referralCode: string | null
  referralLink: string | null
  referralPercent: string
  referralUnlockDays: number
  totalReferralEarned: MoneyString
  lockedReferral: MoneyString
  availableReferral: MoneyString
  redeemedReferral: MoneyString
}

export type ReferralNetworkStatus = 'ACTIVE' | 'NOT_FUNDED'

export type ReferralNetworkPerson = {
  displayName: string
  joinedAt: string
  status: ReferralNetworkStatus
  approvedDepositAmount: MoneyString
  referralEarnings: MoneyString
}

export type ReferralNetwork = {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: MoneyString
  lockedEarnings: MoneyString
  availableEarnings: MoneyString
  redeemedEarnings: MoneyString
  referrals: ReferralNetworkPerson[]
}

export type ReferralRewardItem = {
  id: string
  sourceDepositId: string
  sourceDepositReference: string | null
  sourceAmount: MoneyString
  rewardAmount: MoneyString
  percentApplied: string
  status: ReferralRewardStatus
  unlockAt: string
  redeemedAt: string | null
  createdAt: string
}

export type ReferralRedeemResult = {
  id: string
  status: ReferralRewardStatus
  rewardAmount: MoneyString
  redeemedAt: string | null
  redeemedTransactionId: string | null
  alreadyRedeemed: boolean
}

export const referralService = {
  summary: () => apiClient<ReferralSummary>(API_ROUTES.referrals.summary),

  network: () => apiClient<ReferralNetwork>(API_ROUTES.referrals.network),

  rewards: (query?: { cursor?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (query?.cursor) params.set('cursor', query.cursor)
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return apiClient<{ items: ReferralRewardItem[]; nextCursor: string | null }>(
      `${API_ROUTES.referrals.rewards}${qs ? `?${qs}` : ''}`,
    )
  },

  redeem: (id: string) =>
    apiClient<ReferralRedeemResult>(API_ROUTES.referrals.redeem(id), {
      method: 'POST',
    }),
}
