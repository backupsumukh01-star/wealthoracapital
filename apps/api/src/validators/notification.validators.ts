import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
})
