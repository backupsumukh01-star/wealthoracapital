/**
 * HTTP transport for all domain services.
 * Components must not import this — use `@/services/*` or feature hooks.
 */
export { apiClient, ApiError, type RequestOptions } from '@/lib/api-client'
