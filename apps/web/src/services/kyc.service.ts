import { API_ROUTES, ERROR_CODES, type KycStatus, type User } from '@meridian/shared'

import { ApiError, apiClient } from './http'
import { env } from '@/lib/env'
import { ensureCsrfToken } from '@/lib/csrf'

export type KycProfile = {
  status: KycStatus
  submittedAt: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  infoRequestMessage?: string | null
  documents: Array<{ id: string; kind: string; status: string; side?: string; downloadUrl?: string }>
  submission?: unknown
}

async function apiFormData<T>(path: string, form: FormData): Promise<T> {
  const run = async (forceCsrf: boolean) => {
    const csrf = await ensureCsrfToken(forceCsrf)
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: form,
    })
    const payload = (await response.json()) as { success: true; data: T } | {
      success: false
      error: { code: string; message: string }
    }
    return { response, payload }
  }

  let { response, payload } = await run(false)
  if (!payload.success && payload.error.code === 'CSRF_REJECTED') {
    ;({ response, payload } = await run(true))
  }
  if (response.ok && payload.success) return payload.data
  throw new ApiError(
    (!payload.success && payload.error.code) || ERROR_CODES.INTERNAL_ERROR,
    (!payload.success && payload.error.message) || 'Upload failed.',
    response.status,
  )
}

export const kycService = {
  me: () => apiClient<KycProfile>(API_ROUTES.kyc.me),

  status: () => apiClient<KycProfile>(API_ROUTES.kyc.status),

  update: (body: Record<string, unknown>) =>
    apiClient<KycProfile>(API_ROUTES.kyc.update, { method: 'PATCH', body }),

  submit: (body: Record<string, unknown>) =>
    apiClient<KycProfile>(API_ROUTES.kyc.submit, { method: 'POST', body }),

  uploadDocument: async (kind: string, file: File, side = 'SINGLE'): Promise<KycProfile> => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', kind)
    form.append('side', side)
    return apiFormData<KycProfile>(API_ROUTES.kyc.upload, form)
  },

  history: () => apiClient<{ items: unknown[] }>(API_ROUTES.kyc.history),

  documents: () => apiClient<{ items: unknown[] }>(API_ROUTES.kyc.documents),

  deleteDocument: (id: string) =>
    apiClient<KycProfile>(API_ROUTES.kyc.document(id), {
      method: 'DELETE',
    }),

  /** Admin queue */
  adminList: (query?: {
    status?: string
    q?: string
    country?: string
    riskLevel?: string
    cursor?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    if (query?.q) params.set('q', query.q)
    if (query?.country) params.set('country', query.country)
    if (query?.riskLevel) params.set('riskLevel', query.riskLevel)
    if (query?.cursor) params.set('cursor', query.cursor)
    const qs = params.toString()
    return apiClient<{ items: Array<User & { kyc: KycProfile }>; nextCursor: string | null }>(
      `${API_ROUTES.admin.kyc}${qs ? `?${qs}` : ''}`,
    )
  },

  adminMetrics: () => apiClient<Record<string, unknown>>(`${API_ROUTES.admin.kyc}/metrics`),

  adminGet: (id: string) =>
    apiClient<{
      id: string
      city?: string
      addressLine1?: string
      occupation?: string
      dateOfBirth?: string
      primaryDocumentType?: string
      country?: string
      documents?: Array<{
        id: string
        kind?: string
        documentType?: string
        side?: string
        mimeType?: string
        originalName?: string
        downloadUrl?: string
        storageKey?: string
        publicUrl?: string
        fileExists?: boolean
        absolutePath?: string | null
        status?: string
      }>
      history?: Array<{
        id: string
        action: string
        message?: string | null
        actorId?: string | null
        actorName?: string | null
        actorEmail?: string | null
        oldStatus?: string | null
        newStatus?: string | null
        reason?: string | null
        ip?: string | null
        createdAt: string
      }>
    }>(`${API_ROUTES.admin.kyc}/${id}`),

  /** Authenticated binary fetch for admin document previews (session cookies). */
  adminDocumentBlob: async (submissionOrUserId: string, documentId: string): Promise<Blob> => {
    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.admin.kyc}/${submissionOrUserId}/documents/${documentId}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: '*/*' },
      },
    )
    if (!response.ok) {
      let message = 'Could not load document preview.'
      try {
        const payload = (await response.json()) as {
          error?: { message?: string; code?: string }
        }
        if (payload?.error?.message) message = payload.error.message
      } catch {
        // binary or empty error body
      }
      console.error('[kyc] adminDocumentBlob failed', {
        submissionOrUserId,
        documentId,
        status: response.status,
        message,
      })
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, message, response.status)
    }
    return response.blob()
  },

  adminReview: (userId: string, body: { decision: 'APPROVE' | 'REJECT'; reason?: string }) =>
    apiClient<KycProfile>(`${API_ROUTES.admin.kyc}/${userId}/review`, {
      method: 'POST',
      body,
    }),

  adminApprove: (id: string, body?: Record<string, unknown>) =>
    apiClient<KycProfile>(`${API_ROUTES.admin.kyc}/${id}/approve`, { method: 'POST', body }),

  adminReject: (id: string, body: { reason: string }) =>
    apiClient<KycProfile>(`${API_ROUTES.admin.kyc}/${id}/reject`, { method: 'POST', body }),

  adminRequestInformation: (id: string, body: { reason: string }) =>
    apiClient<KycProfile>(`${API_ROUTES.admin.kyc}/${id}/request-information`, {
      method: 'POST',
      body,
    }),
}
