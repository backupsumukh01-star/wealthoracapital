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

const LANE_DEFAULTS: Record<EmailSenderLane, string> = {
  auth: 'noreply@growzycapital.com',
  support: 'support@growzycapital.com',
  finance: 'info@growzycapital.com',
}

/**
 * Prefer an explicitly configured lane address, then the verified SMTP_FROM_ADDRESS,
 * then product defaults. Never invent a From that isn't backed by env when SMTP is set.
 */
function resolveLaneEmail(configured: string | undefined, lane: EmailSenderLane): string {
  const explicit = configured?.trim()
  if (explicit) return explicit

  const smtp = env.SMTP_FROM_ADDRESS?.trim()
  if (smtp && !smtp.includes('localhost')) return smtp

  return LANE_DEFAULTS[lane]
}

/** Resolve From header for a lane — never invent domains outside configured defaults. */
export function resolveSender(lane: EmailSenderLane): { name: string; email: string; formatted: string } {
  const name = env.SMTP_FROM_NAME || 'Wealthora Capital'
  const map: Record<EmailSenderLane, string | undefined> = {
    auth: env.EMAIL_FROM_AUTH,
    support: env.EMAIL_FROM_SUPPORT,
    finance: env.EMAIL_FROM_FINANCE,
  }
  const email = resolveLaneEmail(map[lane], lane)
  return { name, email, formatted: `${name} <${email}>` }
}

export function senderForCategory(category: EmailCategory) {
  return resolveSender(CATEGORY_LANE[category])
}

export function laneForCategory(category: EmailCategory): EmailSenderLane {
  return CATEGORY_LANE[category]
}
