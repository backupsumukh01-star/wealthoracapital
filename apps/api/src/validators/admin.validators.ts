import { z } from 'zod'

import { AUTH_LIMITS } from '../config/constants.js'

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

const adminPasswordSchema = z
  .string()
  .min(AUTH_LIMITS.minPasswordLength, `Password must be at least ${AUTH_LIMITS.minPasswordLength} characters.`)
  .max(AUTH_LIMITS.maxPasswordLength, `Password must be at most ${AUTH_LIMITS.maxPasswordLength} characters.`)
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character.')

const emptyToUndefined = (val: unknown) => {
  if (val === undefined || val === null) return undefined
  if (typeof val !== 'string') return val
  const trimmed = val.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

export const adminCreateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .transform((value) => value.toLowerCase()),
  password: adminPasswordSchema,
  phone: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(5).max(24).optional(),
  ),
  country: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .length(2, 'Country must be an ISO 3166-1 alpha-2 code.')
      .transform((value) => value.toUpperCase())
      .optional(),
  ),
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

export const adminUserNoteSchema = z.object({
  note: z.string().trim().min(1).max(4000),
})

export const idParamSchema = z.object({
  id: z.string().uuid(),
})
