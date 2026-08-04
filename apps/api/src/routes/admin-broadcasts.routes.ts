import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { broadcastController } from '../controllers/broadcast.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  broadcastListQuerySchema,
  createBroadcastSchema,
  updateBroadcastSchema,
} from '../validators/broadcast.validators.js'

export const adminBroadcastsRouter = Router()

adminBroadcastsRouter.use(requirePermission(PERMISSIONS['broadcasts.manage']))

adminBroadcastsRouter.get('/', validate(broadcastListQuerySchema, 'query'), broadcastController.list)
adminBroadcastsRouter.post('/', validate(createBroadcastSchema), broadcastController.create)
adminBroadcastsRouter.get('/:id', broadcastController.get)
adminBroadcastsRouter.patch('/:id', validate(updateBroadcastSchema), broadcastController.update)
adminBroadcastsRouter.post('/:id/cancel', broadcastController.cancel)
adminBroadcastsRouter.post('/:id/send', broadcastController.send)
