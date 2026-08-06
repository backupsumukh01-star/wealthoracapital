import { API_ROUTES, ERROR_CODES, type ApiResponse } from '@meridian/shared'

import { ApiError } from '@/lib/api-client'
import { ensureCsrfToken } from '@/lib/csrf'
import { env } from '@/lib/env'

import { apiClient } from './http'

export type CmsDownloadVisibility = 'PUBLIC' | 'AUTHENTICATED'
export type CmsDownloadStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type CmsDownload = {
  id: string
  title: string
  description: string | null
  category: string
  thumbnailUrl: string | null
  buttonLabel: string
  version: string
  publishDate: string | null
  visibility: CmsDownloadVisibility
  sortOrder: number
  status: CmsDownloadStatus
  fileName: string
  mimeType: string
  sizeBytes: number
  sizeLabel: string
  storageKey: string
  url: string
  mediaAssetId: string | null
  createdById: string | null
  createdByName: string | null
  downloadCount: number
  archivedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CmsDownloadListQuery = {
  q?: string
  category?: string
  status?: string
  page?: number
  pageSize?: number
}

export type CmsDownloadListResult = {
  items: CmsDownload[]
  total: number
  page: number
  pageSize: number
  categories: string[]
}

export type CmsDownloadMeta = {
  title?: string
  description?: string | null
  category?: string
  thumbnailUrl?: string | null
  buttonLabel?: string
  version?: string
  publishDate?: string | null
  visibility?: CmsDownloadVisibility
  sortOrder?: number
  status?: CmsDownloadStatus
}

async function apiFormData<T>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
  const run = async (forceCsrf: boolean) => {
    const csrf = await ensureCsrfToken(forceCsrf)
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: form,
    }).catch(() => {
      throw new ApiError(ERROR_CODES.NETWORK_ERROR, 'We could not reach the server.', 0)
    })
    const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null
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
}

function appendMeta(form: FormData, meta: CmsDownloadMeta) {
  if (meta.title !== undefined) form.append('title', meta.title)
  if (meta.description !== undefined) form.append('description', meta.description ?? '')
  if (meta.category !== undefined) form.append('category', meta.category)
  if (meta.thumbnailUrl !== undefined) form.append('thumbnailUrl', meta.thumbnailUrl ?? '')
  if (meta.buttonLabel !== undefined) form.append('buttonLabel', meta.buttonLabel)
  if (meta.version !== undefined) form.append('version', meta.version)
  if (meta.publishDate !== undefined) form.append('publishDate', meta.publishDate ?? '')
  if (meta.visibility !== undefined) form.append('visibility', meta.visibility)
  if (meta.sortOrder !== undefined) form.append('sortOrder', String(meta.sortOrder))
  if (meta.status !== undefined) form.append('status', meta.status)
}

export const cmsDownloadService = {
  list: (query?: CmsDownloadListQuery) => {
    const params = new URLSearchParams()
    if (query?.q) params.set('q', query.q)
    if (query?.category) params.set('category', query.category)
    if (query?.status) params.set('status', query.status)
    if (query?.page) params.set('page', String(query.page))
    if (query?.pageSize) params.set('pageSize', String(query.pageSize))
    const qs = params.toString()
    return apiClient<CmsDownloadListResult>(`${API_ROUTES.cms.downloads}${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => apiClient<CmsDownload>(`${API_ROUTES.cms.downloads}/${id}`),

  create: (file: File, meta: CmsDownloadMeta) => {
    const form = new FormData()
    form.append('file', file)
    appendMeta(form, meta)
    return apiFormData<CmsDownload>(API_ROUTES.cms.downloads, form)
  },

  update: (id: string, body: CmsDownloadMeta) =>
    apiClient<CmsDownload>(`${API_ROUTES.cms.downloads}/${id}`, { method: 'PATCH', body }),

  replace: (id: string, file: File, version?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (version) form.append('version', version)
    return apiFormData<CmsDownload>(`${API_ROUTES.cms.downloads}/${id}/replace`, form)
  },

  publish: (id: string) =>
    apiClient<CmsDownload>(`${API_ROUTES.cms.downloads}/${id}/publish`, { method: 'POST' }),

  archive: (id: string) =>
    apiClient<CmsDownload>(`${API_ROUTES.cms.downloads}/${id}/archive`, { method: 'POST' }),

  remove: (id: string) =>
    apiClient<CmsDownload>(`${API_ROUTES.cms.downloads}/${id}`, { method: 'DELETE' }),

  reorder: (ids: string[]) =>
    apiClient<CmsDownloadListResult>(`${API_ROUTES.cms.downloads}/reorder`, {
      method: 'POST',
      body: { ids },
    }),

  publicList: () =>
    apiClient<{ items: CmsDownload[] }>(API_ROUTES.cms.downloadsPublic),

  hit: (id: string) =>
    apiClient<null>(`${API_ROUTES.cms.downloadsPublic}/${id}/hit`, { method: 'POST' }),
}
