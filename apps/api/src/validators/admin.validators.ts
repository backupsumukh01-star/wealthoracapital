import { z } from 'zod'

const userStatusSchema = z.enum([
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'BLOCKED',
  'CLOSED',
  'ARCHIVED',
])

const roleSchema = z.enum(['USER', 'ADMIN', 'SUPER_ADMIN'])
const staffRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'SUPPORT',
  'KYC',
  'CONTENT',
  'VIEWER',
])

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  q: z.string().trim().min(2).max(100).optional(),
  status: userStatusSchema.optional(),
  role: roleSchema.optional(),
  country: z.string().trim().length(2).transform((v) => v.toUpperCase()).optional(),
  phone: z.string().trim().min(3).max(24).optional(),
  referralCode: z.string().trim().min(4).max(16).optional(),
  emailVerified: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  kycStatus: z
    .enum([
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
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sortBy: z
    .enum(['createdAt', 'email', 'status', 'kycStatus', 'firstName', 'lastName'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const adminUpdateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().min(5).max(24).nullable().optional(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .nullable()
    .optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  role: roleSchema.optional(),
  staffRole: staffRoleSchema.nullable().optional(),
})

export const adminStatusReasonSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
  mode: z.enum(['soft', 'hard']).optional(),
})

export const adminAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  q: z.string().trim().min(2).max(100).optional(),
  module: z.string().trim().min(1).max(80).optional(),
  action: z.string().trim().min(1).max(80).optional(),
  actorId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const adminActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  kind: z
    .enum([
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'EMAIL_CHANGE',
      'PROFILE_UPDATE',
      'ADMIN_ACTION',
      'ACCOUNT_STATUS_CHANGE',
      'SESSION_TERMINATED',
      'AVATAR_UPDATE',
      'REGISTRATION',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const idParamSchema = z.object({
  id: z.string().uuid(),
})
