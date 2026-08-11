import { z } from 'zod'

export const referralListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const referralRewardIdParamSchema = z.object({
  id: z.string().uuid(),
})

const referralStatusEnum = z.enum(['LOCKED', 'AVAILABLE', 'REDEEMED', 'CANCELLED'])

export const adminReferralListQuerySchema = z.object({
  q: z.string().max(120).optional(),
  status: referralStatusEnum.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const adminReferralRelationshipsQuerySchema = z.object({
  q: z.string().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
