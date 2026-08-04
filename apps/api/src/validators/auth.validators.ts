import { z } from 'zod'

import { AUTH_LIMITS } from '../config/constants.js'

const passwordSchema = z
  .string()
  .min(AUTH_LIMITS.minPasswordLength, `Password must be at least ${AUTH_LIMITS.minPasswordLength} characters.`)
  .max(AUTH_LIMITS.maxPasswordLength, `Password must be at most ${AUTH_LIMITS.maxPasswordLength} characters.`)
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character.')

const emailSchema = z.string().trim().email('Enter a valid email address.').transform((value) => value.toLowerCase())

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(5).max(24).optional(),
  country: z
    .string()
    .trim()
    .length(2, 'Country must be an ISO 3166-1 alpha-2 code.')
    .transform((value) => value.toUpperCase())
    .optional(),
  referralCode: z.string().trim().min(4).max(16).optional(),
  acceptTerms: z.boolean().optional(),
  acceptRisk: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
  otp: z.string().trim().min(4).max(12).optional(),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required.'),
})

export const resendVerificationSchema = z.object({
  email: emailSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
