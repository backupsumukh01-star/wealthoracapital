'use client'

/**
 * Operator hooks.
 *
 * `usePublishReturn` is the one mutation in the product that must never be optimistic. The UI
 * waits for the server's confirmed result and renders the run summary it returns — showing a
 * settlement as applied before the server says so would be a lie about somebody's balance.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuditLogEntry, DailyReturnRun, Deposit, Trade, User, Withdrawal } from '@meridian/shared'

import { adminApi } from './api'
import type { AdminHealthSnapshot, SearchHit } from '@/types/domain'
import type { QueryHookOptions } from '@/lib/query-client'

export const adminQueryKeys = {
  all: ['admin'] as const,
  health: () => [...adminQueryKeys.all, 'health'] as const,
  overview: () => [...adminQueryKeys.all, 'overview'] as const,
  ops: () => [...adminQueryKeys.all, 'ops'] as const,
  search: (q: string) => [...adminQueryKeys.all, 'search', q] as const,
  activity: (filters?: Record<string, unknown>) => [...adminQueryKeys.all, 'activity', filters ?? {}] as const,
  users: (filters?: Record<string, unknown>) => [...adminQueryKeys.all, 'users', filters ?? {}] as const,
  user: (id: string) => [...adminQueryKeys.all, 'user', id] as const,
  deposits: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'deposits', filters ?? {}] as const,
  deposit: (id: string) => [...adminQueryKeys.all, 'deposit', id] as const,
  withdrawals: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'withdrawals', filters ?? {}] as const,
  withdrawal: (id: string) => [...adminQueryKeys.all, 'withdrawal', id] as const,
  trades: (filters?: Record<string, unknown>) => [...adminQueryKeys.all, 'trades', filters ?? {}] as const,
  returns: () => [...adminQueryKeys.all, 'returns'] as const,
  dailyReturn: () => [...adminQueryKeys.all, 'daily-return'] as const,
  dailyReturnRun: (id: string) => [...adminQueryKeys.all, 'daily-return', id] as const,
  auditLog: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'audit-log', filters ?? {}] as const,
  reports: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'reports', filters ?? {}] as const,
}

/** System health snapshot for the ops dashboard. Auto-refreshes every 30s. */
export function useAdminHealth(options?: QueryHookOptions) {
  return useQuery<AdminHealthSnapshot>({
    queryKey: adminQueryKeys.health(),
    queryFn: () => adminApi.health(),
    enabled: options?.enabled,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  })
}

/** Live operations snapshot — cards, pending queues, charts, activity. */
export function useAdminOpsDashboard(options?: QueryHookOptions) {
  return useQuery({
    queryKey: adminQueryKeys.ops(),
    queryFn: () => adminApi.dashboardOps(),
    enabled: options?.enabled,
    staleTime: 10_000,
    refetchInterval: options?.refetchInterval ?? 15_000,
    refetchOnWindowFocus: true,
  })
}

export function useAdminUsers(query?: { q?: string; cursor?: string }, options?: QueryHookOptions) {
  return useQuery<{ items: User[]; nextCursor: string | null }>({
    queryKey: adminQueryKeys.users(query),
    queryFn: () => adminApi.users(query),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useAdminUser(id: string, options?: QueryHookOptions) {
  return useQuery<User>({
    queryKey: adminQueryKeys.user(id),
    queryFn: () => adminApi.user(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useAdminDeposits(query?: { status?: string }, options?: QueryHookOptions) {
  return useQuery<{ items: Deposit[] }>({
    queryKey: adminQueryKeys.deposits(query),
    queryFn: () => adminApi.deposits(query),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  })
}

export function useAdminWithdrawals(query?: { status?: string }, options?: QueryHookOptions) {
  return useQuery<{ items: Withdrawal[] }>({
    queryKey: adminQueryKeys.withdrawals(query),
    queryFn: () => adminApi.withdrawals(query),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  })
}

export function useAdminTrades(options?: QueryHookOptions) {
  return useQuery<{ items: Trade[] }>({
    queryKey: adminQueryKeys.trades(),
    queryFn: () => adminApi.trades(),
    enabled: options?.enabled,
  })
}

export function useAdminReturns(options?: QueryHookOptions) {
  return useQuery<{ items: DailyReturnRun[] }>({
    queryKey: adminQueryKeys.returns(),
    queryFn: () => adminApi.returns(),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  })
}

export function useAdminAudit(query?: { q?: string; cursor?: string }, options?: QueryHookOptions) {
  return useQuery<{ items: AuditLogEntry[] }>({
    queryKey: adminQueryKeys.auditLog(query),
    queryFn: () => adminApi.audit(query),
    enabled: options?.enabled,
  })
}

export function useAdminActivity(query?: { kind?: string; cursor?: string }, options?: QueryHookOptions) {
  return useQuery<{
    items: Array<{ id: string; kind: string; title: string; description?: string | null; at: string }>
  }>({
    queryKey: adminQueryKeys.activity(query),
    queryFn: () => adminApi.activity(query),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  })
}

/** Command palette / global search. Disabled until there is a query to run. */
export function useAdminSearch(q: string, options?: QueryHookOptions) {
  return useQuery<{ hits: SearchHit[] }>({
    queryKey: adminQueryKeys.search(q),
    queryFn: () => adminApi.search(q),
    enabled: (options?.enabled ?? true) && q.trim().length > 0,
  })
}

export function useAdminDeposit(id: string, options?: QueryHookOptions) {
  return useQuery<Deposit>({
    queryKey: adminQueryKeys.deposit(id),
    queryFn: () => adminApi.deposit(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
  })
}

export function useAdminWithdrawal(id: string, options?: QueryHookOptions) {
  return useQuery<Withdrawal>({
    queryKey: adminQueryKeys.withdrawal(id),
    queryFn: () => adminApi.withdrawal(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
  })
}

export function useReviewDeposit() {
  const queryClient = useQueryClient()

  return useMutation<
    Deposit,
    Error,
    {
      id: string
      decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION'
      reason?: string
      creditedAmount?: string
    }
  >({
    mutationFn: ({ id, ...body }) => adminApi.reviewDeposit(id, body),
    onSuccess: (deposit) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.deposits() })
      queryClient.setQueryData(adminQueryKeys.deposit(deposit.id), deposit)
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.activity() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
    },
  })
}

export function useReviewWithdrawal() {
  const queryClient = useQueryClient()

  return useMutation<
    Withdrawal,
    Error,
    { id: string; decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION' | 'PAID'; reason?: string }
  >({
    mutationFn: ({ id, ...body }) => adminApi.reviewWithdrawal(id, body),
    onSuccess: (withdrawal) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.withdrawals() })
      queryClient.setQueryData(adminQueryKeys.withdrawal(withdrawal.id), withdrawal)
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.activity() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
    },
  })
}

export function usePublishTrade() {
  const queryClient = useQueryClient()

  return useMutation<Trade, Error, string>({
    mutationFn: (id) => adminApi.publishTrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.trades() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.activity() })
    },
  })
}

/** Never optimistic — the run summary rendered is exactly what the server confirms it applied. */
export function usePublishReturn() {
  const queryClient = useQueryClient()

  return useMutation<
    DailyReturnRun,
    Error,
    {
      date: string
      returnPct: string
      idempotencyKey?: string
      preview?: boolean
      notes?: string
      returnBasis?: 'BALANCE' | 'INVESTED'
    }
  >({
    mutationFn: (body) =>
      adminApi.publishReturn({
        ...body,
        idempotencyKey: body.idempotencyKey ?? crypto.randomUUID(),
      }),
    onSuccess: (_data, vars) => {
      if (vars.preview) return
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.returns() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dailyReturn() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.activity() })
    },
  })
}
