export const PLISIO_PROVIDER = 'plisio' as const

export const PLISIO_STATUSES = [
  'new',
  'pending',
  'pending internal',
  'expired',
  'completed',
  'mismatch',
  'error',
  'cancelled',
  'cancelled duplicate',
] as const

export type PlisioStatus = (typeof PLISIO_STATUSES)[number]

export type PlisioInvoiceRequest = {
  orderName: string
  orderNumber: string
  sourceAmount: string
  sourceCurrency: string
  currency?: string
  allowedPsysCids?: string
  email?: string
  description?: string
  callbackUrl: string
  successInvoiceUrl: string
  failInvoiceUrl: string
  expireMin: number
}

export type PlisioInvoiceData = {
  txn_id: string
  invoice_url: string
  invoice_total_sum?: string
}

export type PlisioApiEnvelope<T> = {
  status?: string
  data?: T
}

export type PlisioTx = {
  txid?: string
  tx_id?: string
  value?: string
  processed?: boolean
}

export type PlisioOperation = {
  id?: string
  type?: string
  status?: string
  currency?: string
  psys_cid?: string
  source_currency?: string
  source_amount?: string | number
  amount?: string | number
  tx_url?: string
  tx?: PlisioTx[]
  tx_id?: string[]
  params?: {
    order_number?: string
    order_name?: string
    source_amount?: string | number
    source_currency?: string
    currency?: string
  }
}

export type PlisioWebhookPayload = {
  txn_id: string
  status: string
  order_number?: string
  order_name?: string
  currency?: string
  psys_cid?: string
  source_currency?: string
  source_amount?: string | number
  amount?: string | number
  confirmations?: string | number
  tx_id?: string | string[]
  tx_urls?: string
  verify_hash?: string
  [key: string]: unknown
}
