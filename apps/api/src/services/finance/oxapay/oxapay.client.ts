import { env } from '../../../config/env.js'
import { badRequest, serviceUnavailable } from '../../../utils/errors.js'
import { logger } from '../../../utils/logger.js'
import type {
  OxapayApiEnvelope,
  OxapayInvoiceData,
  OxapayInvoiceRequest,
  OxapayPaymentInfo,
} from './oxapay.types.js'

function baseUrl(): string {
  return env.OXAPAY_API_BASE_URL.replace(/\/$/, '')
}

function requireMerchantKey(): string {
  const key = env.OXAPAY_MERCHANT_API_KEY?.trim()
  if (!key) {
    throw serviceUnavailable('OxaPay crypto gateway is not configured.')
  }
  return key
}

export function isOxapayConfigured(): boolean {
  return Boolean(env.OXAPAY_MERCHANT_API_KEY?.trim())
}

export function oxapayCallbackUrl(): string {
  const configured = env.OXAPAY_CALLBACK_URL?.trim()
  if (configured) return configured
  return `${env.API_URL.replace(/\/$/, '')}/api/v1/webhooks/oxapay`
}

export function oxapayReturnUrl(reference: string): string {
  const configured = env.OXAPAY_RETURN_URL?.trim()
  const base = configured || `${env.APP_URL.replace(/\/$/, '')}/deposit/oxapay/return`
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}ref=${encodeURIComponent(reference)}`
}

async function oxapayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = requireMerchantKey()
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      merchant_api_key: key,
      ...(init?.headers ?? {}),
    },
  })

  let envelope: OxapayApiEnvelope<T> | null = null
  try {
    envelope = (await response.json()) as OxapayApiEnvelope<T>
  } catch {
    throw badRequest('OxaPay returned a non-JSON response.')
  }

  const okHttp = response.ok
  const okStatus = envelope.status == null || envelope.status === 200
  if (!okHttp || !okStatus || !envelope.data) {
    const message =
      envelope.error?.message ||
      envelope.message ||
      `OxaPay request failed (${response.status})`
    logger.warn(
      {
        path,
        httpStatus: response.status,
        oxapayStatus: envelope.status,
        errorKey: envelope.error?.key,
      },
      'OxaPay API error',
    )
    throw badRequest(message)
  }

  return envelope.data
}

export const oxapayClient = {
  isConfigured: isOxapayConfigured,

  async createInvoice(input: OxapayInvoiceRequest): Promise<OxapayInvoiceData> {
    return oxapayFetch<OxapayInvoiceData>('/payment/invoice', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async getPayment(trackId: string): Promise<OxapayPaymentInfo> {
    const id = encodeURIComponent(trackId)
    return oxapayFetch<OxapayPaymentInfo>(`/payment/${id}`, { method: 'GET' })
  },
}
