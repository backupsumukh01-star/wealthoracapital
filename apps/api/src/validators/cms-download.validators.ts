import { z } from 'zod'

export const cmsDownloadMetaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().max(80).optional(),
  thumbnailUrl: z.string().max(500).nullable().optional(),
  buttonLabel: z.string().max(80).optional(),
  version: z.string().max(40).optional(),
  publishDate: z.string().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'AUTHENTICATED']).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED']).optional(),
})

export const cmsDownloadReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
})
