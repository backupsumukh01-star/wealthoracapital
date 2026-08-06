'use client'

import { useQuery } from '@tanstack/react-query'

import {
  activityService,
  type ActivityCategory,
  type ActivityList,
} from '@/services/activity.service'
import type { QueryHookOptions } from '@/lib/query-client'

export const activityQueryKeys = {
  all: ['activity'] as const,
  list: (filters?: Record<string, unknown>) => [...activityQueryKeys.all, 'list', filters ?? {}] as const,
}

export function useActivity(
  query?: { category?: ActivityCategory; kind?: string; cursor?: string; limit?: number },
  options?: QueryHookOptions,
) {
  return useQuery<ActivityList>({
    queryKey: activityQueryKeys.list(query),
    queryFn: () => activityService.list(query),
    enabled: options?.enabled,
  })
}

export type { ActivityCategory, ActivityItem, ActivityList } from '@/services/activity.service'
