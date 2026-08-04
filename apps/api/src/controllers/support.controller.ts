import type { z } from 'zod'

import { supportService } from '../services/support.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  adminListQuerySchema,
  assignTicketSchema,
  categoryUpdateSchema,
  createTicketSchema,
  internalNoteSchema,
  mergeTicketSchema,
  priorityUpdateSchema,
  replyTicketSchema,
  transferTicketSchema,
} from '../validators/support.validators.js'

export const supportController = {
  listMine: asyncHandler(async (req, res) => {
    sendSuccess(res, { items: await supportService.listMine(req.user!.id) })
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(res, await supportService.get(req.params.id!, req.user!.id))
  }),

  create: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await supportService.create(req.user!.id, req.body as z.infer<typeof createTicketSchema>, requestContext(req)),
      201,
    )
  }),

  reply: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await supportService.reply(
        req.params.id!,
        req.user!.id,
        req.body as z.infer<typeof replyTicketSchema>,
        { isAgent: false, userId: req.user!.id },
        requestContext(req),
      ),
    )
  }),

  adminList: asyncHandler(async (req, res) => {
    sendSuccess(res, { items: await supportService.adminList(req.query as z.infer<typeof adminListQuerySchema>) })
  }),

  adminGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await supportService.get(req.params.id!))
  }),

  adminReply: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await supportService.reply(
        req.params.id!,
        req.user!.id,
        req.body as z.infer<typeof replyTicketSchema>,
        { isAgent: true },
        requestContext(req),
      ),
    )
  }),

  assign: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof assignTicketSchema>
    sendSuccess(res, await supportService.assign(req.params.id!, req.user!.id, body.assigneeId, requestContext(req)))
  }),

  updatePriority: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof priorityUpdateSchema>
    sendSuccess(res, await supportService.updatePriority(req.params.id!, req.user!.id, body.priority, requestContext(req)))
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof categoryUpdateSchema>
    sendSuccess(res, await supportService.updateCategory(req.params.id!, req.user!.id, body.category, requestContext(req)))
  }),

  addInternalNote: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof internalNoteSchema>
    sendSuccess(res, await supportService.addInternalNote(req.params.id!, req.user!.id, body.note, requestContext(req)))
  }),

  close: asyncHandler(async (req, res) => {
    sendSuccess(res, await supportService.close(req.params.id!, req.user!.id, requestContext(req)))
  }),

  reopen: asyncHandler(async (req, res) => {
    sendSuccess(res, await supportService.reopen(req.params.id!, req.user!.id, requestContext(req)))
  }),

  merge: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof mergeTicketSchema>
    sendSuccess(res, await supportService.merge(req.params.id!, body.targetId, req.user!.id, requestContext(req)))
  }),

  transfer: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof transferTicketSchema>
    sendSuccess(res, await supportService.transfer(req.params.id!, req.user!.id, body.assigneeId, requestContext(req)))
  }),

  metrics: asyncHandler(async (_req, res) => {
    sendSuccess(res, await supportService.metrics())
  }),
}
