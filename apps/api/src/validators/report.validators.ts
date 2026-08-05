import { z } from 'zod'

const investorReportTypeEnum = z.enum(['PORTFOLIO', 'PERFORMANCE', 'FINANCE', 'DAILY'])

const adminReportTypeEnum = z.enum([
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

/** Investor self-service export — never includes platform-wide KYC/audit/investor dumps. */
export const exportReportSchema = z.object({
  type: investorReportTypeEnum,
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  format: reportFormatEnum,
  filters: z.record(z.string(), z.string()).optional(),
})

export const adminGenerateReportSchema = z.object({
  type: adminReportTypeEnum,
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  format: reportFormatEnum,
  filters: z.record(z.string(), z.string()).optional(),
  scope: z.string().trim().max(20).optional(),
})

export const reportListQuerySchema = z.object({
  type: adminReportTypeEnum.optional(),
  status: reportStatusEnum.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
