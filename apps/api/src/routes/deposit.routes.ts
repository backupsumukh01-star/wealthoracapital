import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { depositUpload, financeController } from '../controllers/finance.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { createDepositSchema, idParamSchema } from '../validators/finance.validators.js'

export const depositRouter = Router()

depositRouter.use(authenticate)

depositRouter.get(
  '/methods',
  requirePermission(PERMISSIONS['deposits.view']),
  financeController.depositMethods,
)
depositRouter.get(
  '/',
  requirePermission(PERMISSIONS['deposits.view']),
  financeController.depositList,
)
depositRouter.get(
  '/:id',
  requirePermission(PERMISSIONS['deposits.view']),
  validate(idParamSchema, 'params'),
  financeController.depositGet,
)
depositRouter.post(
  '/',
  requirePermission(PERMISSIONS['deposits.create']),
  validate(createDepositSchema),
  financeController.depositCreate,
)
depositRouter.post(
  '/:id/proof',
  requirePermission(PERMISSIONS['deposits.create']),
  validate(idParamSchema, 'params'),
  depositUpload.single('file'),
  financeController.depositProof,
)
depositRouter.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS['deposits.create']),
  validate(idParamSchema, 'params'),
  financeController.depositCancel,
)
