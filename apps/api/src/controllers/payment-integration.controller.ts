import type { Request, Response } from 'express'

import { paymentWebhookService } from '../services/finance/payment-webhook.service.js'
import { reconciliationService } from '../services/finance/reconciliation.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

function rawBodyOf(req: Request): string {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody
  if (raw) return raw.toString('utf8')
  return JSON.stringify(req.body ?? {})
}

export const paymentWebhookController = {
  ingest: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentWebhookService.ingest({
      rawBody: rawBodyOf(req),
      body: req.body,
      signatureHeader:
        req.get('x-growzy-signature') ?? req.get('x-payment-signature') ?? undefined,
      nowpaymentsSig: req.get('x-nowpayments-sig') ?? undefined,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
    sendSuccess(res, result, result.duplicate ? 200 : 201)
  }),
}

export const reconciliationController = {
  run: asyncHandler(async (req, res) => {
    const data = await reconciliationService.run(req.user?.id ?? null)
    sendSuccess(res, data)
  }),

  latest: asyncHandler(async (_req, res) => {
    sendSuccess(res, (await reconciliationService.latest()) ?? { status: 'NONE' })
  }),

  syncWallet: asyncHandler(async (req, res) => {
    const data = await reconciliationService.syncWalletFromLedger(req.params.id!)
    sendSuccess(res, data)
  }),

  listWebhooks: asyncHandler(async (req, res) => {
    const query = req.query as { cursor?: string; limit?: string; status?: string }
    const data = await paymentWebhookService.list({
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
      status: query.status,
    })
    sendSuccess(res, data)
  }),
}
