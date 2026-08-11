'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { walletQueryKeys } from '@/features/wallet/hooks'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { QueryHookOptions } from '@/lib/query-client'
import { referralService } from '@/services/referral.service'

export const referralQueryKeys = {
  all: ['referrals'] as const,
  summary: () => [...referralQueryKeys.all, 'summary'] as const,
  rewards: (filters?: Record<string, unknown>) =>
    [...referralQueryKeys.all, 'rewards', filters ?? {}] as const,
}

export function useReferralSummary(options?: QueryHookOptions) {
  return useQuery({
    queryKey: referralQueryKeys.summary(),
    queryFn: () => referralService.summary(),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.fast,
    refetchOnMount: 'always',
  })
}

export function useReferralRewards(
  query?: { cursor?: string; limit?: number },
  options?: QueryHookOptions,
) {
  return useQuery({
    queryKey: referralQueryKeys.rewards(query),
    queryFn: () => referralService.rewards(query),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.fast,
    refetchOnMount: 'always',
  })
}

export function useRedeemReferralReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => referralService.redeem(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: referralQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: walletQueryKeys.all }),
      ])
    },
  })
}
