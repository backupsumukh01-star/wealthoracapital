import type { Request, Response } from 'express'

import { plisioDepositService } from '../services/finance/plisio/plisio-deposit.service.js'
import { plisioWebhookService } from '../services/finance/plisio/plisio-webhook.service.js'
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

export const plisioController = {
  status: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, plisioDepositService.status())
  }),

  createDeposit: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      amount: string
      methodId: string
      notes?: string
      idempotencyKey: string
      email?: string
    }
    const data = await plisioDepositService.create(req.user!.id, body, requestContext(req))
    sendSuccess(res, data, 201)
  }),

  webhook: asyncHandler(async (req: Request, res: Response) => {
    await plisioWebhookService.ingest({
      rawBody: rawBodyOf(req),
      body: req.body,
      context: requestContext(req),
    })
    res.status(200).type('text/plain').send('ok')
  }),
}
