'use client'

/**
 * Deposit hooks.
 *
 * `useCreateDeposit` always sends an idempotency key. A retried submission after a flaky
 * connection must not create a second deposit request (docs/05 §Idempotency).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Deposit, PaymentMethod } from '@meridian/shared'

import { depositsApi, type CreateDepositBody } from './api'
import { walletQueryKeys } from '@/features/wallet/hooks'
import type { QueryHookOptions } from '@/lib/query-client'

export const depositQueryKeys = {
  all: ['deposits'] as const,
  list: (filters?: Record<string, unknown>) => [...depositQueryKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...depositQueryKeys.all, 'detail', id] as const,
  methods: () => [...depositQueryKeys.all, 'methods'] as const,
}

export function useDeposits(
  query?: { status?: string; cursor?: string },
  options?: QueryHookOptions,
) {
  return useQuery<{ items: Deposit[]; nextCursor: string | null }>({
    queryKey: depositQueryKeys.list(query),
    queryFn: () => depositsApi.list(query),
    enabled: options?.enabled,
  })
}

export function useDeposit(id: string, options?: QueryHookOptions) {
  return useQuery<Deposit>({
    queryKey: depositQueryKeys.detail(id),
    queryFn: () => depositsApi.get(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
  })
}

export function useDepositMethods(options?: QueryHookOptions) {
  return useQuery<PaymentMethod[]>({
    queryKey: depositQueryKeys.methods(),
    queryFn: () => depositsApi.methods(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useOxapayStatus(options?: QueryHookOptions) {
  return useQuery({
    queryKey: [...depositQueryKeys.all, 'oxapay-status'] as const,
    queryFn: () => depositsApi.oxapayStatus(),
    enabled: options?.enabled,
    staleTime: 60_000,
  })
}

export type CreateDepositInput = Omit<CreateDepositBody, 'idempotencyKey'> & {
  idempotencyKey?: string
}

export type CreateOxapayDepositInput = Omit<
  import('@/services/deposit.service').CreateOxapayDepositBody,
  'idempotencyKey'
> & {
  idempotencyKey?: string
}

/** A successful create must invalidate the deposit list and the wallet (pending count changes). */
export function useCreateDeposit() {
  const queryClient = useQueryClient()

  return useMutation<Deposit, Error, CreateDepositInput>({
    mutationFn: (input) =>
      depositsApi.create({
        ...input,
        idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
      }),
    onSuccess: (deposit) => {
      queryClient.invalidateQueries({ queryKey: depositQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all })
      queryClient.setQueryData(depositQueryKeys.detail(deposit.id), deposit)
    },
  })
}

export function useCreateOxapayDeposit() {
  const queryClient = useQueryClient()

  return useMutation<Deposit, Error, CreateOxapayDepositInput>({
    mutationFn: (input) =>
      depositsApi.createOxapay({
        ...input,
        idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
      }),
    onSuccess: (deposit) => {
      queryClient.invalidateQueries({ queryKey: depositQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all })
      queryClient.setQueryData(depositQueryKeys.detail(deposit.id), deposit)
    },
  })
}

export function useUploadDepositProof() {
  const queryClient = useQueryClient()

  return useMutation<Deposit, Error, { id: string; file: File }>({
    mutationFn: ({ id, file }) => depositsApi.uploadProof(id, file),
    onSuccess: (deposit) => {
      queryClient.invalidateQueries({ queryKey: depositQueryKeys.all })
      queryClient.setQueryData(depositQueryKeys.detail(deposit.id), deposit)
    },
  })
}

export function useCancelDeposit() {
  const queryClient = useQueryClient()

  return useMutation<Deposit, Error, string>({
    mutationFn: (id) => depositsApi.cancel(id),
    onSuccess: (deposit) => {
      queryClient.invalidateQueries({ queryKey: depositQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.all })
      queryClient.setQueryData(depositQueryKeys.detail(deposit.id), deposit)
    },
  })
}
