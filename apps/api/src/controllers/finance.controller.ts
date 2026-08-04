import multer from 'multer'
import type { DepositStatus, WithdrawalStatus } from '@prisma/client'

import { depositService } from '../services/finance/deposit.service.js'
import { financeMetricsService } from '../services/finance/finance-metrics.service.js'
import { paymentMethodService } from '../services/finance/payment-method.service.js'
import { walletAddressService } from '../services/finance/wallet-address.service.js'
import { walletService } from '../services/finance/wallet.service.js'
import { withdrawalService } from '../services/finance/withdrawal.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { badRequest } from '../utils/errors.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  adminDepositReviewSchema,
  adminFinanceListQuerySchema,
  adminWalletAdjustSchema,
  adminWithdrawalReviewSchema,
  createDepositSchema,
  createWithdrawalSchema,
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
  walletAddressCreateSchema,
  walletAddressUpdateSchema,
} from '../validators/finance.validators.js'
import type { z } from 'zod'

type CreateDeposit = z.infer<typeof createDepositSchema>
type CreateWithdrawal = z.infer<typeof createWithdrawalSchema>
type AdminList = z.infer<typeof adminFinanceListQuerySchema>
type DepositReview = z.infer<typeof adminDepositReviewSchema>
type WithdrawalReview = z.infer<typeof adminWithdrawalReviewSchema>
type WalletAdjust = z.infer<typeof adminWalletAdjustSchema>
type PmCreate = z.infer<typeof paymentMethodCreateSchema>
type PmUpdate = z.infer<typeof paymentMethodUpdateSchema>
type WaCreate = z.infer<typeof walletAddressCreateSchema>
type WaUpdate = z.infer<typeof walletAddressUpdateSchema>

export const depositUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

export const financeController = {
  walletGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await walletService.get(req.user!.id))
  }),

  walletSummary: asyncHandler(async (req, res) => {
    sendSuccess(res, await walletService.summary(req.user!.id))
  }),

  walletTransactions: asyncHandler(async (req, res) => {
    const q = req.query as {
      cursor?: string
      limit?: string
      status?: string
      q?: string
      from?: string
      to?: string
    }
    sendSuccess(
      res,
      await walletService.transactions(req.user!.id, {
        cursor: q.cursor,
        limit: q.limit ? Number(q.limit) : undefined,
        status: q.status,
        q: q.q,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
      }),
    )
  }),

  walletHistory: asyncHandler(async (req, res) => {
    const q = req.query as { cursor?: string; limit?: string }
    sendSuccess(
      res,
      await walletService.history(req.user!.id, {
        cursor: q.cursor,
        limit: q.limit ? Number(q.limit) : undefined,
      }),
    )
  }),

  depositMethods: asyncHandler(async (_req, res) => {
    sendSuccess(res, await depositService.listMethods())
  }),

  depositList: asyncHandler(async (req, res) => {
    const q = req.query as { status?: string; cursor?: string; limit?: string }
    sendSuccess(
      res,
      await depositService.list(req.user!.id, {
        status: q.status as DepositStatus | undefined,
        cursor: q.cursor,
        limit: q.limit ? Number(q.limit) : undefined,
      }),
    )
  }),

  depositGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await depositService.get(req.user!.id, req.params.id!))
  }),

  depositCreate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await depositService.create(req.user!.id, req.body as CreateDeposit, requestContext(req)),
    )
  }),

  depositProof: asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) throw badRequest('Proof file is required.')
    sendSuccess(
      res,
      await depositService.uploadProof(
        req.user!.id,
        req.params.id!,
        {
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
        },
        requestContext(req),
      ),
    )
  }),

  depositCancel: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await depositService.cancel(req.user!.id, req.params.id!, requestContext(req)),
    )
  }),

  withdrawalLimits: asyncHandler(async (req, res) => {
    sendSuccess(res, await withdrawalService.limits(req.user!.id))
  }),

  withdrawalMethods: asyncHandler(async (req, res) => {
    sendSuccess(res, await withdrawalService.listPayoutMethods(req.user!.id))
  }),

  withdrawalList: asyncHandler(async (req, res) => {
    const q = req.query as { status?: string; cursor?: string; limit?: string }
    sendSuccess(
      res,
      await withdrawalService.list(req.user!.id, {
        status: q.status as WithdrawalStatus | undefined,
        cursor: q.cursor,
        limit: q.limit ? Number(q.limit) : undefined,
      }),
    )
  }),

  withdrawalGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await withdrawalService.get(req.user!.id, req.params.id!))
  }),

  withdrawalCreate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.create(
        req.user!.id,
        req.body as CreateWithdrawal,
        requestContext(req),
      ),
    )
  }),

  withdrawalCancel: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.cancel(req.user!.id, req.params.id!, requestContext(req)),
    )
  }),

  transactions: asyncHandler(async (req, res) => {
    const q = req.query as {
      cursor?: string
      limit?: string
      status?: string
      q?: string
      from?: string
      to?: string
    }
    sendSuccess(
      res,
      await walletService.transactions(req.user!.id, {
        cursor: q.cursor,
        limit: q.limit ? Number(q.limit) : undefined,
        status: q.status,
        q: q.q,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
      }),
    )
  }),

  // Admin
  adminWallets: asyncHandler(async (req, res) => {
    const q = req.query as unknown as AdminList
    sendSuccess(
      res,
      await walletService.adminList({
        q: q.q,
        page: q.page,
        limit: q.limit,
      }),
    )
  }),

  adminWalletAdjust: asyncHandler(async (req, res) => {
    const body = req.body as WalletAdjust
    sendSuccess(
      res,
      await walletService.adminAdjust(req.user!.id, req.params.id!, body),
    )
  }),

  adminDeposits: asyncHandler(async (req, res) => {
    const q = req.query as unknown as AdminList
    sendSuccess(
      res,
      await depositService.adminList({
        ...q,
        status: q.status as DepositStatus | undefined,
      }),
    )
  }),

  adminDepositGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await depositService.adminGet(req.params.id!))
  }),

  adminDepositReview: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await depositService.review(
        req.user!.id,
        req.params.id!,
        req.body as DepositReview,
        requestContext(req),
      ),
    )
  }),

  adminWithdrawals: asyncHandler(async (req, res) => {
    const q = req.query as unknown as AdminList
    sendSuccess(
      res,
      await withdrawalService.adminList({
        ...q,
        status: q.status as WithdrawalStatus | undefined,
      }),
    )
  }),

  adminWithdrawalGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await withdrawalService.adminGet(req.params.id!))
  }),

  adminWithdrawalReview: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.review(
        req.user!.id,
        req.params.id!,
        req.body as WithdrawalReview,
        requestContext(req),
      ),
    )
  }),

  adminPaymentMethods: asyncHandler(async (_req, res) => {
    sendSuccess(res, await paymentMethodService.adminList(true))
  }),

  adminPaymentMethodCreate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await paymentMethodService.create(req.user!.id, req.body as PmCreate, requestContext(req)),
    )
  }),

  adminPaymentMethodUpdate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await paymentMethodService.update(
        req.user!.id,
        req.params.id!,
        req.body as PmUpdate,
        requestContext(req),
      ),
    )
  }),

  adminPaymentMethodDelete: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await paymentMethodService.softDelete(req.user!.id, req.params.id!, requestContext(req)),
    )
  }),

  adminWalletAddresses: asyncHandler(async (_req, res) => {
    sendSuccess(res, await walletAddressService.list())
  }),

  adminWalletAddressCreate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await walletAddressService.create(req.user!.id, req.body as WaCreate, requestContext(req)),
    )
  }),

  adminWalletAddressUpdate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await walletAddressService.update(
        req.user!.id,
        req.params.id!,
        req.body as WaUpdate,
        requestContext(req),
      ),
    )
  }),

  adminWalletAddressDelete: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await walletAddressService.softDelete(req.user!.id, req.params.id!, requestContext(req)),
    )
  }),

  adminLedger: asyncHandler(async (req, res) => {
    const q = req.query as unknown as AdminList
    sendSuccess(
      res,
      await financeMetricsService.adminLedger({
        q: q.q,
        page: q.page,
        limit: q.limit,
        from: q.from,
        to: q.to,
      }),
    )
  }),

  adminMetrics: asyncHandler(async (_req, res) => {
    sendSuccess(res, await financeMetricsService.dashboard())
  }),
}
