import { env } from '../config/env.js'

/** Email product categories → badge label + sender lane. */
export type EmailCategory =
  | 'Security'
  | 'Finance'
  | 'Support'
  | 'KYC'
  | 'Investment'
  | 'System'

export type EmailSenderLane = 'auth' | 'support' | 'finance'

const CATEGORY_LANE: Record<EmailCategory, EmailSenderLane> = {
  Security: 'auth',
  Finance: 'finance',
  Support: 'support',
  KYC: 'support',
  Investment: 'finance',
  System: 'finance',
}

/** Resolve From header for a lane — never invent domains outside growzycapital.com defaults. */
export function resolveSender(lane: EmailSenderLane): { name: string; email: string; formatted: string } {
  const name = env.SMTP_FROM_NAME || 'Growzy'
  const map: Record<EmailSenderLane, string> = {
    auth: env.EMAIL_FROM_AUTH || 'noreply@growzycapital.com',
    support: env.EMAIL_FROM_SUPPORT || 'support@growzycapital.com',
    finance: env.EMAIL_FROM_FINANCE || 'info@growzycapital.com',
  }
  const email = map[lane]
  return { name, email, formatted: `${name} <${email}>` }
}

export function senderForCategory(category: EmailCategory) {
  return resolveSender(CATEGORY_LANE[category])
}

export function laneForCategory(category: EmailCategory): EmailSenderLane {
  return CATEGORY_LANE[category]
}
