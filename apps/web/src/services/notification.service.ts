import { API_ROUTES, type Notification } from '@meridian/shared'

import { apiClient } from './http'

export const notificationService = {
  list: (query?: { cursor?: string; unreadOnly?: boolean }) => {
    const params = new URLSearchParams()
    if (query?.cursor) params.set('cursor', query.cursor)
    if (query?.unreadOnly) params.set('unreadOnly', 'true')
    const qs = params.toString()
    return apiClient<{ items: Notification[]; nextCursor: string | null }>(
      `${API_ROUTES.notifications.root}${qs ? `?${qs}` : ''}`,
    )
  },

  unreadCount: () => apiClient<{ count: number }>(API_ROUTES.notifications.unreadCount),

  markRead: (id: string) =>
    apiClient<Notification>(`${API_ROUTES.notifications.root}/${id}/read`, { method: 'POST' }),

  markAllRead: () =>
    apiClient<null>(`${API_ROUTES.notifications.root}/read-all`, { method: 'POST' }),

  archive: (id: string) =>
    apiClient<null>(`${API_ROUTES.notifications.root}/${id}`, { method: 'DELETE' }),
}
