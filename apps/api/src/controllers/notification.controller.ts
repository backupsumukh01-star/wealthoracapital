import type { z } from 'zod'

import { notificationService } from '../services/notification.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'
import type { listNotificationsQuerySchema } from '../validators/notification.validators.js'

type ListQuery = z.infer<typeof listNotificationsQuerySchema>

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListQuery
    sendSuccess(
      res,
      await notificationService.list(req.user!.id, { cursor: query.cursor, unreadOnly: query.unreadOnly }),
    )
  }),

  unreadCount: asyncHandler(async (req, res) => {
    sendSuccess(res, { count: await notificationService.unreadCount(req.user!.id) })
  }),

  markRead: asyncHandler(async (req, res) => {
    sendSuccess(res, await notificationService.markRead(req.params.id!, req.user!.id))
  }),

  markAllRead: asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user!.id)
    sendSuccess(res, null)
  }),

  archive: asyncHandler(async (req, res) => {
    await notificationService.archive(req.params.id!, req.user!.id)
    sendSuccess(res, null)
  }),
}
