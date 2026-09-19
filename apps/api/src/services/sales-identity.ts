import { env } from '../config/env.js'

/** Permanent salesman registration URL. Codes are not users.referral_code. */
export function salesmanReferralLink(code: string): string {
  const site = env.APP_URL.replace(/\/$/, '')
  return `${site}/register?ref=${encodeURIComponent(code)}`
}

export function publicSalesman(row: {
  id: string
  name: string
  email: string
  code: string
  status: 'ACTIVE' | 'DISABLED'
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    code: row.code,
    status: row.status,
    referralLink: salesmanReferralLink(row.code),
  }
}
