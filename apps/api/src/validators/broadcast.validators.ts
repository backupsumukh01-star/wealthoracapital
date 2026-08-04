import { z } from 'zod'

const channelEnum = z.enum(['EMAIL', 'IN_APP', 'POPUP', 'BANNER', 'ANNOUNCEMENT'])
const audienceEnum = z.enum(['ALL', 'SEGMENT', 'COUNTRY', 'VIP', 'SELECTED', 'SINGLE'])

export const createBroadcastSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(3000),
  channels: z.array(channelEnum).min(1),
  audience: audienceEnum,
  audienceFilter: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
})

export const updateBroadcastSchema = createBroadcastSchema.partial()

export const broadcastListQuerySchema = z.object({
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED']).optional(),
})
