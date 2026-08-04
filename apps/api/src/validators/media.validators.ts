import { z } from 'zod'

export const mediaListQuerySchema = z.object({
  folder: z.string().trim().max(80).optional(),
  q: z.string().trim().max(200).optional(),
  kind: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER']).optional(),
  includeDeleted: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const mediaUploadBodySchema = z.object({
  folder: z.string().trim().max(80).optional(),
})

export const mediaRenameSchema = z.object({
  name: z.string().trim().min(1).max(200),
})

export const mediaMoveSchema = z.object({
  folder: z.string().trim().min(1).max(80),
})

export const mediaMetadataSchema = z.object({
  description: z.string().trim().max(500).nullable().optional(),
  usedBy: z.string().trim().max(200).nullable().optional(),
})
