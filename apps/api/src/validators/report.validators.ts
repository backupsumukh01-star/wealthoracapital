import { z } from 'zod'

const reportTypeEnum = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
  'INVESTOR',
  'PORTFOLIO',
  'PERFORMANCE',
  'FINANCE',
  'KYC',
  'AUDIT',
  'CUSTOM',
])
const reportFormatEnum = z.enum(['CSV', 'JSON', 'XLSX', 'PDF'])
const reportStatusEnum = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])

export const exportReportSchema = z.object({
  type: reportTypeEnum,
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  format: reportFormatEnum,
  filters: z.record(z.string(), z.string()).optional(),
})

export const adminGenerateReportSchema = exportReportSchema.extend({
  scope: z.string().trim().max(20).optional(),
})

export const reportListQuerySchema = z.object({
  type: reportTypeEnum.optional(),
  status: reportStatusEnum.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
