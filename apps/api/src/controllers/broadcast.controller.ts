import type { z } from 'zod'

import { broadcastService } from '../services/broadcast.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  broadcastListQuerySchema,
  createBroadcastSchema,
  updateBroadcastSchema,
} from '../validators/broadcast.validators.js'

export const broadcastController = {
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, { items: await broadcastService.list(req.query as z.infer<typeof broadcastListQuerySchema>) })
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(res, await broadcastService.get(req.params.id!))
  }),

  create: asyncHandler(async (req, res) => {
    sendSuccess(res, await broadcastService.create(req.user!.id, req.body as z.infer<typeof createBroadcastSchema>), 201)
  }),

  update: asyncHandler(async (req, res) => {
    sendSuccess(res, await broadcastService.update(req.params.id!, req.body as z.infer<typeof updateBroadcastSchema>))
  }),

  cancel: asyncHandler(async (req, res) => {
    sendSuccess(res, await broadcastService.cancel(req.params.id!))
  }),

  send: asyncHandler(async (req, res) => {
    sendSuccess(res, await broadcastService.send(req.params.id!, req.user!.id, requestContext(req)))
  }),
}
