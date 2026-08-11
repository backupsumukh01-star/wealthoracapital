import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { progressShareController } from '../controllers/progress-share.controller.js'
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { progressShareTokenQuerySchema } from '../validators/progress-share.validators.js'

export const progressShareRouter = Router()

progressShareRouter.post(
  '/link',
  authenticate,
  requirePermission(PERMISSIONS['wallet.view']),
  progressShareController.createLink,
)

progressShareRouter.get(
  '/snapshot',
  optionalAuthenticate,
  validate(progressShareTokenQuerySchema, 'query'),
  progressShareController.snapshot,
)

progressShareRouter.get(
  '/image',
  optionalAuthenticate,
  validate(progressShareTokenQuerySchema, 'query'),
  progressShareController.image,
)
