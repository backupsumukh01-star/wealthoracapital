import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'

export type ActivityCategory = 'deposits' | 'withdrawals' | 'kyc' | 'profit' | 'security'

export type ActivityItem = {
  id: string
  kind: string
  title: string
  description: string | null
  at: string
  createdAt: string
}

export type ActivityList = {
  items: ActivityItem[]
  nextCursor: string | null
}

export const activityService = {
  list: (query?: { category?: ActivityCategory; kind?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (query?.category) params.set('category', query.category)
    if (query?.kind) params.set('kind', query.kind)
    if (query?.cursor) params.set('cursor', query.cursor)
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return apiClient<ActivityList>(`${API_ROUTES.activity.root}${qs ? `?${qs}` : ''}`)
  },
}
