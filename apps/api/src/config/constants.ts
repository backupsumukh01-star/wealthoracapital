export const APP_VERSION = '0.1.0'
export const API_PREFIX = '/api/v1'

export const AUTH_LIMITS = {
  maxFailedLogins: 5,
  lockoutMinutes: 15,
  emailVerificationTtlHours: 24,
  passwordResetTtlHours: 1,
  referralCodeLength: 8,
  minPasswordLength: 10,
  maxPasswordLength: 128,
} as const

/** Dummy bcrypt hash used to equalise login timing when the user does not exist. */
export const DUMMY_PASSWORD_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
