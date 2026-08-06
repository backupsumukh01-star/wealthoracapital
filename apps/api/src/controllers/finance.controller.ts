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
  createPayoutMethodSchema,
  createWithdrawalSchema,
  paymentMethodCreateSchema,
  paymentMethodReorderSchema,
  paymentMethodUpdateSchema,
  updatePayoutMethodSchema,
  walletAddressCreateSchema,
  walletAddressUpdateSchema,
} from '../validators/finance.validators.js'
import type { z } from 'zod'

type CreateDeposit = z.infer<typeof createDepositSchema>
type CreateWithdrawal = z.infer<typeof createWithdrawalSchema>
type CreatePayoutMethod = z.infer<typeof createPayoutMethodSchema>
type UpdatePayoutMethod = z.infer<typeof updatePayoutMethodSchema>
type AdminList = z.infer<typeof adminFinanceListQuerySchema>
type DepositReview = z.infer<typeof adminDepositReviewSchema>
type WithdrawalReview = z.infer<typeof adminWithdrawalReviewSchema>
type WalletAdjust = z.infer<typeof adminWalletAdjustSchema>
type PmCreate = z.infer<typeof paymentMethodCreateSchema>
type PmUpdate = z.infer<typeof paymentMethodUpdateSchema>
type PmReorder = z.infer<typeof paymentMethodReorderSchema>
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

  depositProofFile: asyncHandler(async (req, res) => {
    const user = req.user!
    const isStaff =
      user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || Boolean(user.staffRole)
    const file = await depositService.resolveProofFile({
      id: user.id,
      isStaff,
      depositId: req.params.id!,
    })
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const { storage } = await import('../services/storage/index.js')
    const stream = await storage.openReadStream(file.storageKey)
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Proof file missing on storage disk.' },
        })
      } else {
        res.end()
      }
    })
    stream.pipe(res)
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

  withdrawalMethodCreate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.createPayoutMethod(
        req.user!.id,
        req.body as CreatePayoutMethod,
        requestContext(req),
      ),
    )
  }),

  withdrawalMethodUpdate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.updatePayoutMethod(
        req.user!.id,
        req.params.id!,
        req.body as UpdatePayoutMethod,
        requestContext(req),
      ),
    )
  }),

  withdrawalMethodDelete: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.deletePayoutMethod(
        req.user!.id,
        req.params.id!,
        requestContext(req),
      ),
    )
  }),

  withdrawalMethodSetDefault: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.setDefaultPayoutMethod(
        req.user!.id,
        req.params.id!,
        requestContext(req),
      ),
    )
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

  withdrawalRequestOtp: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await withdrawalService.requestOtp(
        req.user!.id,
        req.body as { amount: string; payoutMethodId: string },
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

  adminDepositProof: asyncHandler(async (req, res) => {
    const file = await depositService.resolveProofFile({
      id: req.user!.id,
      isStaff: true,
      depositId: req.params.id!,
    })
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const { storage } = await import('../services/storage/index.js')
    const stream = await storage.openReadStream(file.storageKey)
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Proof file missing on storage disk.' },
        })
      } else {
        res.end()
      }
    })
    stream.pipe(res)
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

  adminPaymentMethodReorder: asyncHandler(async (req, res) => {
    const body = req.body as PmReorder
    sendSuccess(
      res,
      await paymentMethodService.reorder(req.user!.id, body.orderedIds, requestContext(req)),
    )
  }),

  adminWalletAddresses: asyncHandler(async (req, res) => {
    const paymentMethodId =
      typeof req.query.paymentMethodId === 'string' ? req.query.paymentMethodId : undefined
    sendSuccess(res, await walletAddressService.list(paymentMethodId))
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
