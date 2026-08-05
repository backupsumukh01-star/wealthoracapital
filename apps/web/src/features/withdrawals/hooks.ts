'use client'

/**
 * Withdrawal hooks.
 *
 * A successful create invalidates the wallet summary as well as the withdrawal list: the
 * requested amount is locked immediately, so a stale available balance would let the investor
 * request the same funds twice.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PayoutMethod, Withdrawal } from '@meridian/shared'

import { withdrawalsApi, type CreateWithdrawalBody } from './api'
import { walletQueryKeys } from '@/features/wallet/hooks'
import type { QueryHookOptions } from '@/lib/query-client'

export const withdrawalQueryKeys = {
  all: ['withdrawals'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...withdrawalQueryKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...withdrawalQueryKeys.all, 'detail', id] as const,
  limits: () => [...withdrawalQueryKeys.all, 'limits'] as const,
  payoutMethods: () => [...withdrawalQueryKeys.all, 'payout-methods'] as const,
}

export function useWithdrawals(
  query?: { status?: string; cursor?: string },
  options?: QueryHookOptions,
) {
  return useQuery<{ items: Withdrawal[]; nextCursor: string | null }>({
    queryKey: withdrawalQueryKeys.list(query),
    queryFn: () => withdrawalsApi.list(query),
    enabled: options?.enabled,
  })
}

export function useWithdrawal(id: string, options?: QueryHookOptions) {
  return useQuery<Withdrawal>({
    queryKey: withdrawalQueryKeys.detail(id),
    queryFn: () => withdrawalsApi.get(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
  })
}

export function useWithdrawalLimits(options?: QueryHookOptions) {
  return useQuery<{ min: string; max: string; dailyRemaining: string; feePct: string }>({
    queryKey: withdrawalQueryKeys.limits(),
    queryFn: () => withdrawalsApi.limits(),
    enabled: options?.enabled,
  })
}

export function usePayoutMethods(options?: QueryHookOptions) {
  return useQuery<PayoutMethod[]>({
    queryKey: withdrawalQueryKeys.payoutMethods(),
    queryFn: () => withdrawalsApi.payoutMethods(),
    enabled: options?.enabled,
  })
}

export type CreateWithdrawalInput = Omit<CreateWithdrawalBody, 'idempotencyKey'> & {
  idempotencyKey?: string
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient()

  return useMutation<Withdrawal, Error, CreateWithdrawalInput>({
    mutationFn: (input) =>
      withdrawalsApi.create({
        ...input,
        idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
      }),
    onSuccess: (withdrawal) => {
      queryClient.invalidateQueries({ queryKey: withdrawalQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all })
      queryClient.setQueryData(withdrawalQueryKeys.detail(withdrawal.id), withdrawal)
    },
  })
}

export function useCancelWithdrawal() {
  const queryClient = useQueryClient()

  return useMutation<Withdrawal, Error, string>({
    mutationFn: (id) => withdrawalsApi.cancel(id),
    onSuccess: (withdrawal) => {
      queryClient.invalidateQueries({ queryKey: withdrawalQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all })
      queryClient.setQueryData(withdrawalQueryKeys.detail(withdrawal.id), withdrawal)
    },
  })
}
