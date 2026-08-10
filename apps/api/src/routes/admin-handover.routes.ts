import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { handoverController } from '../controllers/handover.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { handoverResetRateLimiter } from '../middlewares/rate-limit.js'
import { validate } from '../middlewares/validate.js'
import {
  handoverPreviewSchema,
  handoverResetSchema,
} from '../validators/handover.validators.js'

export const adminHandoverRouter = Router()

adminHandoverRouter.post(
  '/handover/reset/preview',
  requirePermission(PERMISSIONS['settings.handover']),
  validate(handoverPreviewSchema),
  handoverController.preview,
)

adminHandoverRouter.post(
  '/handover/reset',
  handoverResetRateLimiter,
  requirePermission(PERMISSIONS['settings.handover']),
  validate(handoverResetSchema),
  handoverController.reset,
)
