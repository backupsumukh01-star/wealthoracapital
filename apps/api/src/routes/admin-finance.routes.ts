import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { financeController } from '../controllers/finance.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  adminDepositReviewSchema,
  adminFinanceListQuerySchema,
  adminWalletAdjustSchema,
  adminWithdrawalReviewSchema,
  idParamSchema,
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
  walletAddressCreateSchema,
  walletAddressUpdateSchema,
} from '../validators/finance.validators.js'

export const adminFinanceRouter = Router()

adminFinanceRouter.get(
  '/finance/metrics',
  requirePermission(PERMISSIONS['finance.view']),
  financeController.adminMetrics,
)

adminFinanceRouter.get(
  '/wallets',
  requirePermission(PERMISSIONS['finance.view']),
  validate(adminFinanceListQuerySchema, 'query'),
  financeController.adminWallets,
)
adminFinanceRouter.post(
  '/wallets/:id/adjust',
  requirePermission(PERMISSIONS['finance.adjust']),
  validate(idParamSchema, 'params'),
  validate(adminWalletAdjustSchema),
  financeController.adminWalletAdjust,
)

adminFinanceRouter.get(
  '/deposits',
  requirePermission(PERMISSIONS['finance.view']),
  validate(adminFinanceListQuerySchema, 'query'),
  financeController.adminDeposits,
)
adminFinanceRouter.get(
  '/deposits/:id',
  requirePermission(PERMISSIONS['finance.view']),
  validate(idParamSchema, 'params'),
  financeController.adminDepositGet,
)
adminFinanceRouter.post(
  '/deposits/:id/review',
  requirePermission(PERMISSIONS['finance.review']),
  validate(idParamSchema, 'params'),
  validate(adminDepositReviewSchema),
  financeController.adminDepositReview,
)
adminFinanceRouter.post(
  '/deposits/:id/approve',
  requirePermission(PERMISSIONS['finance.review']),
  validate(idParamSchema, 'params'),
  async (req, _res, next) => {
    req.body = { ...(req.body as object), decision: 'APPROVE' }
    next()
  },
  financeController.adminDepositReview,
)
adminFinanceRouter.post(
  '/deposits/:id/reject',
  requirePermission(PERMISSIONS['finance.review']),
  validate(idParamSchema, 'params'),
  async (req, _res, next) => {
    req.body = { ...(req.body as object), decision: 'REJECT' }
    next()
  },
  financeController.adminDepositReview,
)

adminFinanceRouter.get(
  '/withdrawals',
  requirePermission(PERMISSIONS['finance.view']),
  validate(adminFinanceListQuerySchema, 'query'),
  financeController.adminWithdrawals,
)
adminFinanceRouter.get(
  '/withdrawals/:id',
  requirePermission(PERMISSIONS['finance.view']),
  validate(idParamSchema, 'params'),
  financeController.adminWithdrawalGet,
)
adminFinanceRouter.post(
  '/withdrawals/:id/review',
  requirePermission(PERMISSIONS['finance.review']),
  validate(idParamSchema, 'params'),
  validate(adminWithdrawalReviewSchema),
  financeController.adminWithdrawalReview,
)
adminFinanceRouter.post(
  '/withdrawals/:id/approve',
  requirePermission(PERMISSIONS['finance.review']),
  validate(idParamSchema, 'params'),
  async (req, _res, next) => {
    req.body = { ...(req.body as object), decision: 'APPROVE' }
    next()
  },
  financeController.adminWithdrawalReview,
)
adminFinanceRouter.post(
  '/withdrawals/:id/reject',
  requirePermission(PERMISSIONS['finance.review']),
  validate(idParamSchema, 'params'),
  async (req, _res, next) => {
    req.body = { ...(req.body as object), decision: 'REJECT' }
    next()
  },
  financeController.adminWithdrawalReview,
)
adminFinanceRouter.post(
  '/withdrawals/:id/mark-paid',
  requirePermission(PERMISSIONS['finance.review']),
  validate(idParamSchema, 'params'),
  async (req, _res, next) => {
    req.body = { ...(req.body as object), decision: 'PAID' }
    next()
  },
  financeController.adminWithdrawalReview,
)

adminFinanceRouter.get(
  '/payment-methods',
  requirePermission(PERMISSIONS['finance.manage']),
  financeController.adminPaymentMethods,
)
adminFinanceRouter.post(
  '/payment-methods',
  requirePermission(PERMISSIONS['finance.manage']),
  validate(paymentMethodCreateSchema),
  financeController.adminPaymentMethodCreate,
)
adminFinanceRouter.patch(
  '/payment-methods/:id',
  requirePermission(PERMISSIONS['finance.manage']),
  validate(idParamSchema, 'params'),
  validate(paymentMethodUpdateSchema),
  financeController.adminPaymentMethodUpdate,
)
adminFinanceRouter.delete(
  '/payment-methods/:id',
  requirePermission(PERMISSIONS['finance.manage']),
  validate(idParamSchema, 'params'),
  financeController.adminPaymentMethodDelete,
)

adminFinanceRouter.get(
  '/wallet-addresses',
  requirePermission(PERMISSIONS['finance.manage']),
  financeController.adminWalletAddresses,
)
adminFinanceRouter.post(
  '/wallet-addresses',
  requirePermission(PERMISSIONS['finance.manage']),
  validate(walletAddressCreateSchema),
  financeController.adminWalletAddressCreate,
)
adminFinanceRouter.patch(
  '/wallet-addresses/:id',
  requirePermission(PERMISSIONS['finance.manage']),
  validate(idParamSchema, 'params'),
  validate(walletAddressUpdateSchema),
  financeController.adminWalletAddressUpdate,
)
adminFinanceRouter.delete(
  '/wallet-addresses/:id',
  requirePermission(PERMISSIONS['finance.manage']),
  validate(idParamSchema, 'params'),
  financeController.adminWalletAddressDelete,
)

adminFinanceRouter.get(
  '/ledger',
  requirePermission(PERMISSIONS['finance.view']),
  validate(adminFinanceListQuerySchema, 'query'),
  financeController.adminLedger,
)
