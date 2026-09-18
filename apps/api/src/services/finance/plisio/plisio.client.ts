import { env } from '../../../config/env.js'
import { badRequest, serviceUnavailable } from '../../../utils/errors.js'
import { logger } from '../../../utils/logger.js'
import type { PlisioApiEnvelope, PlisioInvoiceData, PlisioInvoiceRequest, PlisioOperation } from './plisio.types.js'

function baseUrl(): string {
  return env.PLISIO_API_BASE_URL.replace(/\/$/, '')
}

function requireApiKey(): string {
  const key = env.PLISIO_API_KEY?.trim()
  if (!key) {
    throw serviceUnavailable('Plisio crypto gateway is not configured.')
  }
  return key
}

export function isPlisioConfigured(): boolean {
  return Boolean(env.PLISIO_API_KEY?.trim())
}

export function plisioCallbackUrl(): string {
  const configured = env.PLISIO_CALLBACK_URL?.trim()
  if (configured) return configured
  return `${env.API_URL.replace(/\/$/, '')}/api/v1/webhooks/plisio?json=true`
}

export function plisioReturnUrl(reference: string): string {
  const configured = env.PLISIO_RETURN_URL?.trim()
  const base = configured || `${env.APP_URL.replace(/\/$/, '')}/deposit/oxapay/return`
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}ref=${encodeURIComponent(reference)}`
}

async function plisioGet<T>(path: string, query: Record<string, string>): Promise<T> {
  const apiKey = requireApiKey()
  const url = new URL(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`)
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value)
  }
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url, { method: 'GET' })
  let envelope: PlisioApiEnvelope<T> | null = null
  try {
    envelope = (await response.json()) as PlisioApiEnvelope<T>
  } catch {
    throw badRequest('Plisio returned a non-JSON response.')
  }

  if (!response.ok || envelope.status !== 'success' || !envelope.data) {
    const data = envelope.data as { message?: string } | undefined
    const message = data?.message || `Plisio request failed (${response.status})`
    logger.warn(
      { path, httpStatus: response.status, plisioStatus: envelope.status },
      'Plisio API error',
    )
    throw badRequest(message)
  }

  return envelope.data
}

export const plisioClient = {
  isConfigured: isPlisioConfigured,

  async createInvoice(input: PlisioInvoiceRequest): Promise<PlisioInvoiceData> {
    return plisioGet<PlisioInvoiceData>('/invoices/new', {
      order_name: input.orderName,
      order_number: input.orderNumber,
      source_currency: input.sourceCurrency,
      source_amount: input.sourceAmount,
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.allowedPsysCids ? { allowed_psys_cids: input.allowedPsysCids } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.description ? { description: input.description } : {}),
      callback_url: input.callbackUrl,
      success_invoice_url: input.successInvoiceUrl,
      fail_invoice_url: input.failInvoiceUrl,
      expire_min: String(input.expireMin),
    })
  },

  async getOperation(txnId: string): Promise<PlisioOperation> {
    const id = encodeURIComponent(txnId)
    return plisioGet<PlisioOperation>(`/operations/${id}`, {})
  },
}
