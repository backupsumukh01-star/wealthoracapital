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

import {
  withdrawalsApi,
  type CreatePayoutMethodBody,
  type CreateWithdrawalBody,
  type RequestWithdrawalOtpBody,
  type UpdatePayoutMethodBody,
  type WithdrawalLimits,
} from './api'
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
  return useQuery<WithdrawalLimits>({
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

function invalidatePayoutMethods(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: withdrawalQueryKeys.payoutMethods() })
}

export function useCreatePayoutMethod() {
  const queryClient = useQueryClient()

  return useMutation<PayoutMethod, Error, CreatePayoutMethodBody>({
    mutationFn: (input) => withdrawalsApi.createPayoutMethod(input),
    onSuccess: () => {
      void invalidatePayoutMethods(queryClient)
    },
  })
}

export function useUpdatePayoutMethod() {
  const queryClient = useQueryClient()

  return useMutation<PayoutMethod, Error, { id: string; body: UpdatePayoutMethodBody }>({
    mutationFn: ({ id, body }) => withdrawalsApi.updatePayoutMethod(id, body),
    onSuccess: () => {
      void invalidatePayoutMethods(queryClient)
    },
  })
}

export function useDeletePayoutMethod() {
  const queryClient = useQueryClient()

  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => withdrawalsApi.deletePayoutMethod(id),
    onSuccess: () => {
      void invalidatePayoutMethods(queryClient)
    },
  })
}

export function useSetDefaultPayoutMethod() {
  const queryClient = useQueryClient()

  return useMutation<PayoutMethod, Error, string>({
    mutationFn: (id) => withdrawalsApi.setDefaultPayoutMethod(id),
    onSuccess: () => {
      void invalidatePayoutMethods(queryClient)
    },
  })
}

export function useRequestWithdrawalOtp() {
  return useMutation<
    { expiresAt?: string; maskedEmail?: string; message?: string },
    Error,
    RequestWithdrawalOtpBody
  >({
    mutationFn: (input) => withdrawalsApi.requestOtp(input),
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
