import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'

export type Broadcast = {
  id: string
  title: string
  body: string
  channels: Array<'EMAIL' | 'IN_APP' | 'POPUP' | 'BANNER' | 'ANNOUNCEMENT'>
  audience: 'ALL' | 'SEGMENT' | 'COUNTRY' | 'VIP' | 'SELECTED' | 'SINGLE'
  audienceFilter: Record<string, unknown> | null
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'
  scheduledAt: string | null
  sentAt: string | null
  stats: { recipientCount?: number } | null
  createdAt: string
  updatedAt: string
}

type CreateBroadcastBody = {
  title: string
  body: string
  channels: Broadcast['channels']
  audience: Broadcast['audience']
  audienceFilter?: Record<string, unknown>
  scheduledAt?: string | null
}

/** Admin broadcast composer — email / in-app / popup / banner / announcement, with scheduling. */
export const broadcastService = {
  list: (query?: { status?: string }) => {
    const qs = query?.status ? `?status=${query.status}` : ''
    return apiClient<{ items: Broadcast[] }>(`${API_ROUTES.admin.broadcasts}${qs}`)
  },

  get: (id: string) => apiClient<Broadcast>(`${API_ROUTES.admin.broadcasts}/${id}`),

  create: (body: CreateBroadcastBody) => apiClient<Broadcast>(API_ROUTES.admin.broadcasts, { method: 'POST', body }),

  update: (id: string, body: Partial<CreateBroadcastBody>) =>
    apiClient<Broadcast>(`${API_ROUTES.admin.broadcasts}/${id}`, { method: 'PATCH', body }),

  cancel: (id: string) => apiClient<Broadcast>(`${API_ROUTES.admin.broadcasts}/${id}/cancel`, { method: 'POST' }),

  send: (id: string) => apiClient<Broadcast>(`${API_ROUTES.admin.broadcasts}/${id}/send`, { method: 'POST' }),
}
