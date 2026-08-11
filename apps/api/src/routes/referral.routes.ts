import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { referralController } from '../controllers/referral.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  referralListQuerySchema,
  referralRewardIdParamSchema,
} from '../validators/referral.validators.js'

export const referralRouter = Router()

referralRouter.use(authenticate)

referralRouter.get(
  '/summary',
  requirePermission(PERMISSIONS['wallet.view']),
  referralController.summary,
)

referralRouter.get(
  '/network',
  requirePermission(PERMISSIONS['wallet.view']),
  referralController.network,
)

referralRouter.get(
  '/rewards',
  requirePermission(PERMISSIONS['wallet.view']),
  validate(referralListQuerySchema, 'query'),
  referralController.listRewards,
)

referralRouter.post(
  '/rewards/:id/redeem',
  requirePermission(PERMISSIONS['wallet.view']),
  validate(referralRewardIdParamSchema, 'params'),
  referralController.redeem,
)
