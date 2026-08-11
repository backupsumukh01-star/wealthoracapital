import { createHmac, timingSafeEqual } from 'node:crypto'

import type { OxapayStatus } from './oxapay.types.js'
import { OXAPAY_STATUSES } from './oxapay.types.js'

export function oxapayHmacSha512Hex(rawBody: string, merchantApiKey: string): string {
  return createHmac('sha512', merchantApiKey).update(rawBody, 'utf8').digest('hex')
}

export function oxapaySignaturesMatch(expectedHex: string, provided: string | undefined): boolean {
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

export function verifyOxapayWebhookHmac(input: {
  rawBody: string
  hmacHeader: string | undefined
  merchantApiKey: string
}): boolean {
  if (!input.merchantApiKey) return false
  const expected = oxapayHmacSha512Hex(input.rawBody, input.merchantApiKey)
  return oxapaySignaturesMatch(expected, input.hmacHeader)
}

/** Normalize OxaPay status strings (docs use both `Paid` and `paid`). */
export function normalizeOxapayStatus(raw: string | undefined | null): OxapayStatus | 'unknown' {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if ((OXAPAY_STATUSES as readonly string[]).includes(value)) {
    return value as OxapayStatus
  }
  return 'unknown'
}

export function buildOxapayWebhookEventId(input: {
  trackId: string
  status: string
  txHash?: string | null
}): string {
  const status = normalizeOxapayStatus(input.status)
  const base = `oxapay:${input.trackId}:${status}`
  if (input.txHash) return `${base}:${input.txHash}`.slice(0, 160)
  return base.slice(0, 160)
}
