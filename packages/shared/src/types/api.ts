/**
 * The response envelope from docs/05-api-structure.md §1.
 * Every response, success or failure, has this shape.
 */

export interface ResponseMeta {
  requestId: string
  timestamp: string
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta: ResponseMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
}

export interface ApiPaginated<T> {
  success: true
  data: T[]
  pagination: PaginationMeta
  meta: ResponseMeta
}

export interface ApiErrorBody {
  code: string
  /** Always safe to display to an end user. */
  message: string
  details?: unknown
}

export interface ApiFailure {
  success: false
  error: ApiErrorBody
  meta: ResponseMeta
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

/** Query shape shared by every list endpoint. */
export interface ListQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  from?: string
  to?: string
  q?: string
}
