import { Router } from 'express'

import { notificationController } from '../controllers/notification.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { listNotificationsQuerySchema } from '../validators/notification.validators.js'

export const notificationRouter = Router()

notificationRouter.use(authenticate)

notificationRouter.get('/', validate(listNotificationsQuerySchema, 'query'), notificationController.list)
notificationRouter.get('/unread-count', notificationController.unreadCount)
notificationRouter.post('/read-all', notificationController.markAllRead)
notificationRouter.post('/:id/read', notificationController.markRead)
notificationRouter.delete('/:id', notificationController.archive)
