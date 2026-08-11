import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '../../config/env.js'
import { unauthorized } from '../../utils/errors.js'

/** Default share-link lifetime: 7 days (email CTA + dashboard copy link). */
export const PROGRESS_SHARE_TTL_SECONDS = 7 * 24 * 60 * 60

type ProgressShareClaims = {
  /** Subject user id — never put in the URL as a raw query param. */
  uid: string
  exp: number
}

function signBody(body: string): string {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`psv1:${body}`).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/** Mint an opaque, expiring share token. Payload is signed; do not put PII in the URL. */
export function signProgressShareToken(
  userId: string,
  ttlSeconds = PROGRESS_SHARE_TTL_SECONDS,
): { token: string; expiresAt: Date } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const claims: ProgressShareClaims = { uid: userId, exp }
  const body = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url')
  const token = `${body}.${signBody(body)}`
  return { token, expiresAt: new Date(exp * 1000) }
}

/** Verify share token. Rejects invalid signatures and expired tokens. */
export function verifyProgressShareToken(token: string): { userId: string; expiresAt: Date } {
  const trimmed = token.trim()
  const parts = trimmed.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw unauthorized('Invalid share token.')
  }
  const [body, sig] = parts
  if (!safeEqual(signBody(body), sig)) {
    throw unauthorized('Invalid share token.')
  }

  let claims: ProgressShareClaims
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ProgressShareClaims
  } catch {
    throw unauthorized('Invalid share token.')
  }

  if (!claims || typeof claims.uid !== 'string' || !claims.uid || typeof claims.exp !== 'number') {
    throw unauthorized('Invalid share token.')
  }
  if (claims.exp < Math.floor(Date.now() / 1000)) {
    throw unauthorized('Share link expired.')
  }

  return { userId: claims.uid, expiresAt: new Date(claims.exp * 1000) }
}
