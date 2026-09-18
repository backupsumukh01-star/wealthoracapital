/**
 * Sales Portal customer identity is limited to display name + username.
 * Username is the email local-part only — the domain (and the address) never leave this helper.
 */
export function salesUsernameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? ''
  return local || 'investor'
}

/** Fields that must never appear on salesman-facing customer payloads. */
export const SALES_BLOCKED_CUSTOMER_KEYS = [
  'email',
  'phone',
  'address',
  'dateOfBirth',
  'dob',
  'aadhaar',
  'pan',
  'passport',
  'kycStatus',
  'kycDocuments',
  'passwordHash',
  'password',
  'googleId',
  'twoFactorSecret',
  'refreshToken',
  'accessToken',
  'bankAccount',
  'bankDetails',
  'walletKey',
  'privateKey',
] as const

export function collectBlockedSalesCustomerKeys(payload: unknown): string[] {
  const json = JSON.stringify(payload)
  return SALES_BLOCKED_CUSTOMER_KEYS.filter((key) => {
    const quoted = `"${key}"`
    return json.includes(quoted)
  })
}
