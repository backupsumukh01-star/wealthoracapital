import type { Request, Response } from 'express'

import { oxapayDepositService } from '../services/finance/oxapay/oxapay-deposit.service.js'
import { oxapayWebhookService } from '../services/finance/oxapay/oxapay-webhook.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

function rawBodyOf(req: Request): string {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody
  if (raw) return raw.toString('utf8')
  return JSON.stringify(req.body ?? {})
}

function requestContext(req: Request) {
  return { ip: req.ip, userAgent: req.get('user-agent') }
}

export const oxapayController = {
  status: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, oxapayDepositService.status())
  }),

  createDeposit: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      amount: string
      methodId: string
      notes?: string
      idempotencyKey: string
      email?: string
    }
    const data = await oxapayDepositService.create(req.user!.id, body, requestContext(req))
    sendSuccess(res, data, 201)
  }),

  /**
   * OxaPay server IPN — must acknowledge with plain body `ok` (not JSON envelope).
   */
  webhook: asyncHandler(async (req: Request, res: Response) => {
    await oxapayWebhookService.ingest({
      rawBody: rawBodyOf(req),
      body: req.body,
      hmacHeader: req.get('hmac') ?? req.get('HMAC') ?? undefined,
      context: requestContext(req),
    })
    res.status(200).type('text/plain').send('ok')
  }),
}
