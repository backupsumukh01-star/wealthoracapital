import { createHmac, timingSafeEqual } from 'node:crypto'

import type { PlisioStatus } from './plisio.types.js'
import { PLISIO_STATUSES } from './plisio.types.js'

export function plisioHmacSha1Hex(message: string, secret: string): string {
  return createHmac('sha1', secret).update(message, 'utf8').digest('hex')
}

export function plisioSignaturesMatch(expectedHex: string, provided: string | undefined): boolean {
  if (!provided) return false
  const a = expectedHex.trim().toLowerCase()
  const b = provided.trim().toLowerCase()
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length || ba.length === 0) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

/**
 * Plisio Node callback (`json=true`): HMAC-SHA1 of JSON.stringify(body without verify_hash).
 * Key order is the parsed object's enumerable order (Plisio's documented Node example).
 */
export function verifyPlisioJsonCallback(
  data: Record<string, unknown>,
  secret: string,
): boolean {
  if (!secret) return false
  const provided = typeof data.verify_hash === 'string' ? data.verify_hash : ''
  if (!provided) return false
  const ordered: Record<string, unknown> = { ...data }
  delete ordered.verify_hash
  const expected = plisioHmacSha1Hex(JSON.stringify(ordered), secret)
  return plisioSignaturesMatch(expected, provided)
}

export function signPlisioJsonCallback(
  data: Record<string, unknown>,
  secret: string,
): string {
  const ordered: Record<string, unknown> = { ...data }
  delete ordered.verify_hash
  return plisioHmacSha1Hex(JSON.stringify(ordered), secret)
}

export function normalizePlisioStatus(raw: string | undefined | null): PlisioStatus | 'unknown' {
  const value = String(raw ?? '').trim().toLowerCase()
  if (value === 'overpaid') return 'mismatch'
  if ((PLISIO_STATUSES as readonly string[]).includes(value)) {
    return value as PlisioStatus
  }
  return 'unknown'
}

/** Invoice is paid in full, including Plisio "mismatch" (overpaid). Extra crypto is not credited. */
export function isPlisioPaidStatus(status: PlisioStatus | 'unknown'): boolean {
  return status === 'completed' || status === 'mismatch'
}

export function buildPlisioWebhookEventId(input: {
  txnId: string
  status: string
  txHash?: string | null
}): string {
  const status = normalizePlisioStatus(input.status).replace(/\s+/g, '_')
  const base = `plisio:${input.txnId}:${status}`
  if (input.txHash) return `${base}:${input.txHash}`.slice(0, 160)
  return base.slice(0, 160)
}
