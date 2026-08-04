import { z } from 'zod'

export const emailTemplateListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const emailTemplateCreateSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase kebab-case.'),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40).optional(),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
})

export const emailTemplateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  bodyHtml: z.string().min(1).optional(),
  bodyText: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const emailTemplatePreviewSchema = z.object({
  variables: z.record(z.string(), z.string()).default({}),
})

export const emailOutboxListQuerySchema = z.object({
  status: z.enum(['QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const emailTestSendSchema = z.object({
  to: z.string().email(),
  templateKey: z.string().trim().min(2).max(80).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  html: z.string().optional(),
  variables: z.record(z.string(), z.string()).default({}),
})
