import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { financeController } from '../controllers/finance.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  createPayoutMethodSchema,
  createWithdrawalSchema,
  idParamSchema,
  requestWithdrawalOtpSchema,
  updatePayoutMethodSchema,
} from '../validators/finance.validators.js'

export const withdrawalRouter = Router()

withdrawalRouter.use(authenticate)

withdrawalRouter.get(
  '/limits',
  requirePermission(PERMISSIONS['withdrawals.view']),
  financeController.withdrawalLimits,
)
withdrawalRouter.get(
  '/methods',
  requirePermission(PERMISSIONS['withdrawals.view']),
  financeController.withdrawalMethods,
)
withdrawalRouter.post(
  '/methods',
  requirePermission(PERMISSIONS['withdrawals.create']),
  validate(createPayoutMethodSchema),
  financeController.withdrawalMethodCreate,
)
withdrawalRouter.patch(
  '/methods/:id',
  requirePermission(PERMISSIONS['withdrawals.create']),
  validate(idParamSchema, 'params'),
  validate(updatePayoutMethodSchema),
  financeController.withdrawalMethodUpdate,
)
withdrawalRouter.delete(
  '/methods/:id',
  requirePermission(PERMISSIONS['withdrawals.create']),
  validate(idParamSchema, 'params'),
  financeController.withdrawalMethodDelete,
)
withdrawalRouter.post(
  '/methods/:id/default',
  requirePermission(PERMISSIONS['withdrawals.create']),
  validate(idParamSchema, 'params'),
  financeController.withdrawalMethodSetDefault,
)
withdrawalRouter.get(
  '/',
  requirePermission(PERMISSIONS['withdrawals.view']),
  financeController.withdrawalList,
)
withdrawalRouter.get(
  '/:id',
  requirePermission(PERMISSIONS['withdrawals.view']),
  validate(idParamSchema, 'params'),
  financeController.withdrawalGet,
)
withdrawalRouter.post(
  '/otp',
  requirePermission(PERMISSIONS['withdrawals.create']),
  validate(requestWithdrawalOtpSchema),
  financeController.withdrawalRequestOtp,
)
withdrawalRouter.post(
  '/',
  requirePermission(PERMISSIONS['withdrawals.create']),
  validate(createWithdrawalSchema),
  financeController.withdrawalCreate,
)
withdrawalRouter.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS['withdrawals.create']),
  validate(idParamSchema, 'params'),
  financeController.withdrawalCancel,
)
