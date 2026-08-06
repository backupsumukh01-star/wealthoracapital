import { API_ROUTES, ERROR_CODES, type ApiResponse } from '@meridian/shared'

import { env } from '@/lib/env'
import { ApiError } from '@/lib/api-client'
import { ensureCsrfToken } from '@/lib/csrf'

import { apiClient } from './http'

export type MediaAsset = {
  id: string
  name: string
  folder: string
  kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER'
  mimeType: string
  size: number
  key: string
  url: string
  usedBy: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Admin media manager — file listing/metadata go through `apiClient`; uploads need multipart. */
export const mediaService = {
  list: (query?: { folder?: string; q?: string; kind?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (query?.folder) params.set('folder', query.folder)
    if (query?.q) params.set('q', query.q)
    if (query?.kind) params.set('kind', query.kind)
    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return apiClient<{ items: MediaAsset[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `${API_ROUTES.admin.media}${qs ? `?${qs}` : ''}`,
    )
  },

  folders: () => apiClient<{ items: string[] }>(`${API_ROUTES.admin.media}/folders`),

  get: (id: string) => apiClient<MediaAsset>(`${API_ROUTES.admin.media}/${id}`),

  upload: async (file: File, folder?: string): Promise<MediaAsset> => {
    const form = new FormData()
    form.append('file', file)
    if (folder) form.append('folder', folder)

    const run = async (forceCsrf: boolean) => {
      const csrf = await ensureCsrfToken(forceCsrf)
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${API_ROUTES.admin.media}/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: form,
      }).catch(() => {
        throw new ApiError(ERROR_CODES.NETWORK_ERROR, 'We could not reach the server.', 0)
      })
      const payload = (await response.json().catch(() => null)) as ApiResponse<MediaAsset> | null
      return { response, payload }
    }

    let { response, payload } = await run(false)
    if (response.status === 403 && payload && !payload.success && payload.error.code === 'CSRF_REJECTED') {
      ;({ response, payload } = await run(true))
    }
    if (response.ok && payload?.success) return payload.data
    const error = payload && !payload.success ? payload.error : null
    throw new ApiError(
      error?.code ?? ERROR_CODES.INTERNAL_ERROR,
      error?.message ?? 'Upload failed.',
      response.status,
      error?.details,
    )
  },

  rename: (id: string, name: string) =>
    apiClient<MediaAsset>(`${API_ROUTES.admin.media}/${id}/rename`, { method: 'PATCH', body: { name } }),

  move: (id: string, folder: string) =>
    apiClient<MediaAsset>(`${API_ROUTES.admin.media}/${id}/move`, { method: 'PATCH', body: { folder } }),

  updateMetadata: (id: string, body: { description?: string | null; usedBy?: string | null }) =>
    apiClient<MediaAsset>(`${API_ROUTES.admin.media}/${id}/metadata`, { method: 'PATCH', body }),

  softDelete: (id: string) => apiClient<MediaAsset>(`${API_ROUTES.admin.media}/${id}`, { method: 'DELETE' }),

  restore: (id: string) => apiClient<MediaAsset>(`${API_ROUTES.admin.media}/${id}/restore`, { method: 'POST' }),
}
