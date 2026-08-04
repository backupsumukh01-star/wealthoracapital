/**
 * Client-side feature flag defaults.
 * Runtime authority: Admin OS toggles today → `GET /settings/public` + admin flags tomorrow.
 */
export const DEFAULT_FEATURE_FLAGS = {
  registration: true,
  login: true,
  deposits: true,
  withdrawals: true,
  kyc: true,
  trading: true,
  reports: true,
  notifications: true,
  support: true,
  referrals: false,
  email: true,
  maintenance: false,
} as const

export type FeatureFlagKey = keyof typeof DEFAULT_FEATURE_FLAGS
