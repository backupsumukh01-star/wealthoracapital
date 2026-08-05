'use client'

/** CMS hooks. Public bootstrap is the single payload the marketing shell hydrates from. */

import { useQuery } from '@tanstack/react-query'

import { cmsApi } from './api'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { QueryHookOptions } from '@/lib/query-client'
import type { CmsPublicBootstrap } from '@/types/domain'

export const cmsQueryKeys = {
  all: ['cms'] as const,
  bootstrap: () => [...cmsQueryKeys.all, 'bootstrap'] as const,
}

/** Landing content + platform copy + FAQs + feature flags — fetched once per session. */
export function useCmsBootstrap(options?: QueryHookOptions) {
  return useQuery<CmsPublicBootstrap>({
    queryKey: cmsQueryKeys.bootstrap(),
    queryFn: () => cmsApi.publicBootstrap(),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.slow,
  })
}
