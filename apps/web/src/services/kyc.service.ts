import { API_ROUTES, type KycStatus, type User } from '@meridian/shared'

import { ApiError, apiClient } from './http'
import { ERROR_CODES } from '@meridian/shared'

export type KycProfile = {
  status: KycStatus
  submittedAt: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  documents: Array<{ id: string; kind: string; status: string }>
}

export const kycService = {
  me: () => apiClient<KycProfile>(API_ROUTES.kyc.me),

  submit: (body: Record<string, unknown>) =>
    apiClient<KycProfile>(API_ROUTES.kyc.root, { method: 'POST', body }),

  uploadDocument: async (_kind: string, _file: File): Promise<KycProfile> => {
    throw new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'KYC document upload is not connected to the API yet.',
      501,
    )
  },

  /** Admin queue */
  adminList: (query?: { status?: string }) => {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    const qs = params.toString()
    return apiClient<{ items: Array<User & { kyc: KycProfile }>; nextCursor: string | null }>(
      `${API_ROUTES.admin.kyc}${qs ? `?${qs}` : ''}`,
    )
  },

  adminReview: (userId: string, body: { decision: 'APPROVE' | 'REJECT'; reason?: string }) =>
    apiClient<KycProfile>(`${API_ROUTES.admin.kyc}/${userId}/review`, {
      method: 'POST',
      body,
    }),
}
