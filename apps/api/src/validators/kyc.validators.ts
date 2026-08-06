import { z } from 'zod'

export const kycDocumentTypeSchema = z.enum([
  'PASSPORT',
  'NATIONAL_ID',
  'DRIVING_LICENSE',
  'RESIDENCE_PERMIT',
  'PROOF_OF_ADDRESS',
  'SELFIE',
  'BANK_STATEMENT',
  'UTILITY_BILL',
])

export const kycDocumentSideSchema = z.enum(['FRONT', 'BACK', 'SINGLE'])

export const kycStatusSchema = z.enum([
  'NOT_STARTED',
  'PENDING',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEED_MORE_INFO',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'SUSPENDED',
])

export const kycUpsertSchema = z.object({
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date of birth.'),
  nationality: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional(),
  addressLine1: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(24).optional(),
  occupation: z.string().trim().max(80).optional(),
  primaryDocumentType: kycDocumentTypeSchema.optional(),
})

export const kycUploadMetaSchema = z.object({
  documentType: kycDocumentTypeSchema,
  side: kycDocumentSideSchema.default('SINGLE'),
})

export const kycAdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  q: z.string().trim().min(2).max(100).optional(),
  status: kycStatusSchema.optional(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  reviewerId: z.string().uuid().optional(),
  documentType: kycDocumentTypeSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const kycReviewBodySchema = z.object({
  reason: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(3).max(1000).optional(),
  ),
  internalNotes: z.string().trim().max(2000).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
  fraudFlag: z.boolean().optional(),
  documentQuality: z.number().int().min(0).max(100).optional(),
  assignedReviewerId: z.string().uuid().optional(),
})

/** Request-information / reject require a human-readable reason. */
export const kycRequestInfoBodySchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  internalNotes: z.string().trim().max(2000).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
  fraudFlag: z.boolean().optional(),
  documentQuality: z.number().int().min(0).max(100).optional(),
  assignedReviewerId: z.string().uuid().optional(),
})

export const kycCompatReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().min(3).max(1000).optional(),
})
