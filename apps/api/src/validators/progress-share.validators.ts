import { z } from 'zod'

export const progressShareTokenQuerySchema = z.object({
  t: z.string().min(20).max(2048).optional(),
  /** Explicitly captured so we can reject IDOR attempts. */
  userId: z.string().optional(),
  kind: z.enum(['journey', 'daily']).optional(),
})
