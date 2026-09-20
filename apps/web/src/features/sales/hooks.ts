import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api-client'
import { QUERY_STALE_TIME } from '@/lib/constants'
import { salesOwnerService } from '@/services/sales-owner.service'
import { salesService } from '@/services/sales.service'

import { isSalesUnauthorized } from './auth-errors'
import type { SalesMeResponse } from './types'

export const salesQueryKeys = {
  all: ['sales'] as const,
  me: () => [...salesQueryKeys.all, 'me'] as const,
  networkSummary: () => [...salesQueryKeys.all, 'me', 'network-summary'] as const,
  networkMembers: () => [...salesQueryKeys.all, 'me', 'network-members'] as const,
  networkMember: (userId: string) => [...salesQueryKeys.all, 'me', 'network-member', userId] as const,
  owner: {
    salesmen: () => [...salesQueryKeys.all, 'owner', 'salesmen'] as const,
    summary: (salesmanId: string) =>
      [...salesQueryKeys.all, 'owner', 'summary', salesmanId] as const,
    members: (salesmanId: string) =>
      [...salesQueryKeys.all, 'owner', 'members', salesmanId] as const,
  },
}

export function useSalesMe(enabled = true) {
  return useQuery({
    queryKey: salesQueryKeys.me(),
    queryFn: async (): Promise<SalesMeResponse | null> => {
      try {
        return await salesService.me()
      } catch (error) {
        if (isSalesUnauthorized(error)) return null
        throw error
      }
    },
    enabled,
    retry: false,
    staleTime: QUERY_STALE_TIME.normal,
    refetchOnWindowFocus: false,
  })
}

export function useSalesLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => salesService.login(body),
    onSuccess: (payload) => {
      queryClient.removeQueries({ queryKey: salesQueryKeys.all })
      queryClient.setQueryData(salesQueryKeys.me(), payload)
    },
  })
}

export function useSalesLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => salesService.logout(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: salesQueryKeys.all })
      queryClient.setQueryData(salesQueryKeys.me(), null)
    },
  })
}

export function useSalesNetworkSummary() {
  return useQuery({
    queryKey: salesQueryKeys.networkSummary(),
    queryFn: () => salesService.networkSummary(),
    staleTime: QUERY_STALE_TIME.fast,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 1
    },
  })
}

export function useSalesNetworkMembers() {
  return useQuery({
    queryKey: salesQueryKeys.networkMembers(),
    queryFn: () => salesService.networkMembers(),
    staleTime: QUERY_STALE_TIME.fast,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 1
    },
  })
}

export function useSalesNetworkMember(userId: string | undefined) {
  return useQuery({
    queryKey: salesQueryKeys.networkMember(userId ?? ''),
    queryFn: () => salesService.networkMember(userId!),
    enabled: Boolean(userId),
    staleTime: QUERY_STALE_TIME.fast,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 1
    },
  })
}

export function useOwnerSalesmen() {
  return useQuery({
    queryKey: salesQueryKeys.owner.salesmen(),
    queryFn: () => salesOwnerService.listSalesmen(),
    staleTime: QUERY_STALE_TIME.normal,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 1
    },
  })
}

export function useCreateSalesman() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; email: string; code?: string }) =>
      salesOwnerService.createSalesman(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.owner.salesmen() })
    },
  })
}

export function useUpdateSalesman() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      salesmanId: string
      body: { name?: string; email?: string; status?: 'ACTIVE' | 'DISABLED'; code?: string }
    }) => salesOwnerService.updateSalesman(input.salesmanId, input.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.owner.salesmen() })
    },
  })
}

export function useResetSalesmanPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (salesmanId: string) => salesOwnerService.resetPassword(salesmanId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.owner.salesmen() })
    },
  })
}

export function useOwnerNetworkSummary(salesmanId: string | undefined) {
  return useQuery({
    queryKey: salesQueryKeys.owner.summary(salesmanId ?? ''),
    queryFn: () => salesOwnerService.networkSummary(salesmanId!),
    enabled: Boolean(salesmanId),
    staleTime: QUERY_STALE_TIME.fast,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 1
    },
  })
}

export function useOwnerNetworkMembers(salesmanId: string | undefined) {
  return useQuery({
    queryKey: salesQueryKeys.owner.members(salesmanId ?? ''),
    queryFn: () => salesOwnerService.networkMembers(salesmanId!),
    enabled: Boolean(salesmanId),
    staleTime: QUERY_STALE_TIME.fast,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 1
    },
  })
}
