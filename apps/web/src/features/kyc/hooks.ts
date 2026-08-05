/**
 * KYC hooks — status, draft update, document upload, submit.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { KycDocumentType } from '@meridian/shared'

import { authQueryKeys } from '@/features/auth/hooks'
import { kycService, type KycProfile } from '@/services/kyc.service'

export const kycQueryKeys = {
  all: ['kyc'] as const,
  status: () => [...kycQueryKeys.all, 'status'] as const,
  history: () => [...kycQueryKeys.all, 'history'] as const,
  documents: () => [...kycQueryKeys.all, 'documents'] as const,
}

export type KycUpdateBody = {
  country: string
  dateOfBirth: string
  nationality?: string
  addressLine1?: string
  city?: string
  postalCode?: string
  occupation?: string
  primaryDocumentType?: KycDocumentType
}

export type KycUploadInput = {
  kind: string
  file: File
  side?: string
}

export function useKycStatus(enabled = true) {
  return useQuery({
    queryKey: kycQueryKeys.status(),
    queryFn: kycService.status,
    enabled,
    staleTime: 30_000,
  })
}

function invalidateKyc(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: kycQueryKeys.all })
  void queryClient.invalidateQueries({ queryKey: authQueryKeys.session() })
}

export function useUpdateKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: KycUpdateBody) => kycService.update(body),
    onSuccess: (data: KycProfile) => {
      queryClient.setQueryData(kycQueryKeys.status(), data)
      invalidateKyc(queryClient)
    },
  })
}

export function useUploadKycDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, file, side = 'SINGLE' }: KycUploadInput) =>
      kycService.uploadDocument(kind, file, side),
    onSuccess: (data: KycProfile) => {
      queryClient.setQueryData(kycQueryKeys.status(), data)
      invalidateKyc(queryClient)
    },
  })
}

export function useSubmitKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown> = {}) => kycService.submit(body),
    onSuccess: (data: KycProfile) => {
      queryClient.setQueryData(kycQueryKeys.status(), data)
      invalidateKyc(queryClient)
    },
  })
}

export function kycStatusBadge(status: string): {
  label: string
  tone: 'warning' | 'info' | 'profit' | 'loss' | 'neutral'
} {
  switch (status) {
    case 'NOT_STARTED':
      return { label: 'Not started', tone: 'neutral' }
    case 'PENDING':
      return { label: 'In progress', tone: 'info' }
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return { label: 'Under Review', tone: 'warning' }
    case 'NEED_MORE_INFO':
      return { label: 'More info needed', tone: 'warning' }
    case 'APPROVED':
      return { label: 'Verified', tone: 'profit' }
    case 'REJECTED':
      return { label: 'Rejected', tone: 'loss' }
    case 'EXPIRED':
      return { label: 'Expired', tone: 'loss' }
    case 'SUSPENDED':
      return { label: 'Suspended', tone: 'loss' }
    default:
      return { label: status, tone: 'neutral' }
  }
}
