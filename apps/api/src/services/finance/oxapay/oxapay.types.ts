/** OxaPay invoice + payment-info shapes used by Wealthora (documented fields only). */

export const OXAPAY_PROVIDER = 'oxapay' as const

export const OXAPAY_STATUSES = [
  'new',
  'waiting',
  'paying',
  'paid',
  'underpaid',
  'expired',
  'refunding',
  'refunded',
  'manual_accept',
] as const

export type OxapayStatus = (typeof OXAPAY_STATUSES)[number]

export type OxapayInvoiceRequest = {
  amount: number
  currency: string
  lifetime: number
  callback_url: string
  return_url: string
  order_id: string
  email?: string
  description?: string
  sandbox: boolean
}

export type OxapayInvoiceData = {
  track_id: string
  payment_url: string
  expired_at: number
  date: number
}

export type OxapayApiEnvelope<T> = {
  data?: T
  message?: string
  error?: { type?: string; key?: string; message?: string } | null
  status?: number
  version?: string
}

export type OxapayTx = {
  tx_hash?: string
  amount?: number
  currency?: string
  network?: string
  address?: string
  status?: string
  confirmations?: number
  sent_amount?: number
  received_amount?: number
  value?: number
  sent_value?: number
  date?: number
}

export type OxapayPaymentInfo = {
  track_id: string
  type?: string
  amount: number
  currency: string
  status: string
  order_id?: string
  email?: string
  description?: string
  callback_url?: string
  return_url?: string
  lifetime?: number
  expired_at?: number
  date?: number
  txs?: OxapayTx[]
}

export type OxapayWebhookPayload = {
  track_id: string
  status: string
  type?: string
  amount?: number
  value?: number
  sent_value?: number
  currency?: string
  order_id?: string
  email?: string
  description?: string
  date?: number
  txs?: OxapayTx[]
  [key: string]: unknown
}
