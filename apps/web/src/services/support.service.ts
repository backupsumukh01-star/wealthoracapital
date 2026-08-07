import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'
import type { SupportTicket } from '@/types/domain'

export const supportService = {
  listMine: () => apiClient<{ items: SupportTicket[] }>(API_ROUTES.support.tickets),

  get: (id: string) => apiClient<SupportTicket>(`${API_ROUTES.support.tickets}/${id}`),

  create: (body: { subject: string; body: string; category?: string }) =>
    apiClient<SupportTicket>(API_ROUTES.support.tickets, { method: 'POST', body }),

  reply: (id: string, body: { message: string }) =>
    apiClient<SupportTicket>(`${API_ROUTES.support.tickets}/${id}/messages`, {
      method: 'POST',
      body,
    }),

  adminList: (query?: { status?: string }) => {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    const qs = params.toString()
    return apiClient<{ items: SupportTicket[] }>(
      `${API_ROUTES.admin.support}${qs ? `?${qs}` : ''}`,
    )
  },

  adminReply: (id: string, body: { message: string }) =>
    apiClient<SupportTicket>(`${API_ROUTES.admin.support}/${id}/messages`, {
      method: 'POST',
      body,
    }),

  adminUpdatePriority: (id: string, priority: string) =>
    apiClient<SupportTicket>(`${API_ROUTES.admin.support}/${id}/priority`, {
      method: 'POST',
      body: { priority },
    }),

  adminClose: (id: string) =>
    apiClient<SupportTicket>(`${API_ROUTES.admin.support}/${id}/close`, {
      method: 'POST',
      body: {},
    }),
}
