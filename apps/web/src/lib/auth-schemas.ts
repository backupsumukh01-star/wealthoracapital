import { z } from 'zod'

/** Client-only schemas for auth UI validation. Swap for shared API schemas later. */

const passwordRules = z
  .string()
  .min(10, 'Use at least 10 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[0-9]/, 'Include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Include at least one special character')

export const loginSchema = z.object({
  /** Email or username. */
  identifier: z
    .string()
    .trim()
    .min(2, 'Enter your email or username')
    .max(120, 'That looks too long'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean().default(false),
})

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Enter your first name').max(40, 'Too long'),
    lastName: z.string().trim().min(2, 'Enter your last name').max(40, 'Too long'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .min(8, 'Enter a valid mobile number')
      .max(24, 'Mobile number is too long')
      .regex(/^[+\d\s()-]+$/, 'Use digits and + ( ) - only'),
    password: passwordRules,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    referralCode: z
      .string()
      .optional()
      .transform((value) => {
        const trimmed = (value ?? '').trim().toUpperCase()
        return trimmed.length === 0 ? undefined : trimmed
      })
      .refine((value) => value === undefined || (value.length >= 4 && value.length <= 16), {
        message: 'Enter a valid referral code (4–16 characters)',
      }),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, { message: 'Accept the terms to continue' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/** Normalize a `?ref=` query value for the registration form (trim + uppercase). */
export function normalizeReferralRefParam(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase()
}

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export const resetPasswordSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const onboardingPersonalSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(80),
  dateOfBirth: z.string().min(4, 'Enter your date of birth'),
  country: z.string().min(2, 'Select your country'),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  address: z.string().trim().min(5, 'Enter your address').max(200),
})

export const onboardingPreferencesSchema = z.object({
  riskTolerance: z.enum(['conservative', 'balanced', 'growth']),
  monthlyContribution: z.enum(['under_500', '500_2000', '2000_plus']),
  goal: z.enum(['income', 'growth', 'both']),
  horizon: z.enum(['short', 'medium', 'long']),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type OtpInput = z.infer<typeof otpSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type OnboardingPersonalInput = z.infer<typeof onboardingPersonalSchema>
export type OnboardingPreferencesInput = z.infer<typeof onboardingPreferencesSchema>

export const onboardingKycSchema = z.object({
  country: z.string().min(2, 'Select your country'),
  dateOfBirth: z.string().min(4, 'Enter your date of birth'),
  address: z.string().trim().min(5, 'Enter your address').max(200),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  occupation: z.string().trim().min(2, 'Enter your occupation').max(80),
  idType: z.enum(['PASSPORT', 'DRIVING_LICENSE', 'NATIONAL_ID']),
})

export type OnboardingKycInput = z.infer<typeof onboardingKycSchema>

export const COUNTRIES = [
  { value: 'PK', label: 'Pakistan' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'IN', label: 'India' },
  { value: 'SG', label: 'Singapore' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'TR', label: 'Türkiye' },
  { value: 'EG', label: 'Egypt' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
] as const

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: string
} {
  let score = 0
  if (password.length >= 10) score++
  if (password.length >= 14) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const
  return { score: clamped, label: labels[clamped] }
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
