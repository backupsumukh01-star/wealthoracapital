import { API_ROUTES } from '@meridian/shared'

import { apiClient, type RequestOptions } from '@/lib/api-client'

/**
 * Salesman HTTP transport. Uses the shared fetch wrapper with credentials/cookies,
 * but silent-refresh must hit `/sales/auth/refresh` — never investor `/auth/refresh`.
 */
export function salesApiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiClient<T>(path, {
    ...options,
    refreshPath: API_ROUTES.sales.auth.refresh,
  })
}
