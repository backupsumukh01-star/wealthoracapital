import { z } from 'zod'

/** CMS documents are frontend-owned JSON blobs — validate as a plain object, not a strict shape. */
export const cmsContentSchema = z.record(z.string(), z.unknown())

export const cmsPublishBodySchema = z.object({
  content: cmsContentSchema.optional(),
})

export const cmsScheduleBodySchema = z.object({
  content: cmsContentSchema,
  scheduledAt: z.string().datetime(),
})

export const cmsFaqCreateSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(3000),
  category: z.string().trim().max(80).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
})

export const cmsFaqUpdateSchema = cmsFaqCreateSchema.partial()

export const cmsTestimonialCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  country: z.string().trim().max(80).optional(),
  quote: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  platform: z.string().trim().max(60).optional(),
  photoUrl: z.string().trim().max(400).optional(),
  order: z.number().int().min(0).optional(),
})

export const cmsTestimonialUpdateSchema = cmsTestimonialCreateSchema.partial().extend({
  enabled: z.boolean().optional(),
})

export const cmsAnnouncementCreateSchema = z.object({
  type: z
    .enum(['MAINTENANCE', 'PROMOTION', 'NEWS', 'RETURN', 'POPUP', 'TOP_BANNER', 'DASHBOARD_BANNER'])
    .optional(),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  displayPage: z.enum(['ALL', 'HOME', 'DASHBOARD', 'WALLET']).optional(),
  color: z.string().trim().max(20).optional(),
  sticky: z.boolean().optional(),
  popup: z.boolean().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
})

export const cmsAnnouncementUpdateSchema = cmsAnnouncementCreateSchema.partial()

export const cmsPageUpsertSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
})

export const cmsDocumentKeyParamSchema = z.object({
  key: z.enum(['landing', 'platform']).transform((v) => v.toUpperCase() as 'LANDING' | 'PLATFORM'),
})
