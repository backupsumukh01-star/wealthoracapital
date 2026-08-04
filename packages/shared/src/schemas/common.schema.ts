import { z } from 'zod'

/**
 * Shared query schemas.
 *
 * The domain schemas (auth, deposit, withdrawal, trade, daily-return) land alongside this file
 * when the API is built. They are defined once here and consumed by both the Express `validate`
 * middleware and the web app's `zodResolver`, which is what makes client/server drift impossible
 * (docs/02 §5). Only the generic list/pagination shapes exist during the scaffold, because the UI
 * already needs them to parse URL state.
 */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const sortSchema = z.object({
  sortBy: z.string().min(1).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const dateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export const listQuerySchema = paginationSchema
  .merge(sortSchema)
  .merge(dateRangeSchema)
  .extend({ q: z.string().trim().max(120).optional() })

export type PaginationQuery = z.infer<typeof paginationSchema>
export type SortQuery = z.infer<typeof sortSchema>
export type DateRangeQuery = z.infer<typeof dateRangeSchema>
export type ListQueryInput = z.infer<typeof listQuerySchema>
