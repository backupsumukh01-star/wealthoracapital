import { z } from 'zod'

const money = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, 'Amount must be a positive decimal string.')

export const cursorLimitQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().optional(),
  q: z.string().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const createDepositSchema = z.object({
  amount: money,
  methodId: z.string().uuid(),
  userReference: z.string().max(120).optional(),
  txHash: z.string().max(120).optional(),
  idempotencyKey: z.string().min(8).max(120),
})

export const createWithdrawalSchema = z.object({
  amount: money,
  payoutMethodId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(120),
})

export const idParamSchema = z.object({
  id: z.string().uuid(),
})

export const adminFinanceListQuerySchema = z.object({
  q: z.string().max(120).optional(),
  status: z.string().optional(),
  paymentMethodId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  minAmount: money.optional(),
  maxAmount: money.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
})

export const adminDepositReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_INFORMATION', 'FORCE_COMPLETE', 'FORCE_CANCEL']),
  reason: z.string().max(1000).optional(),
  creditedAmount: money.optional(),
  internalNotes: z.string().max(2000).optional(),
})

export const adminWithdrawalReviewSchema = z.object({
  decision: z.enum([
    'APPROVE',
    'REJECT',
    'PAID',
    'REQUEST_INFORMATION',
    'FORCE_COMPLETE',
    'FORCE_CANCEL',
  ]),
  reason: z.string().max(1000).optional(),
  transactionRef: z.string().max(120).optional(),
  internalNotes: z.string().max(2000).optional(),
})

export const adminWalletAdjustSchema = z.object({
  amount: money,
  direction: z.enum(['CREDIT', 'DEBIT']),
  reason: z.string().min(3).max(500),
  idempotencyKey: z.string().min(8).max(120),
})

export const paymentMethodCreateSchema = z.object({
  name: z.string().min(2).max(80),
  type: z.enum([
    'BANK_TRANSFER',
    'USDT_TRC20',
    'USDT_BEP20',
    'BTC',
    'ETH',
    'MANUAL',
    'CRYPTO',
    'MOBILE_WALLET',
    'OTHER',
  ]),
  instructions: z.string().min(3).max(2000),
  accountDetails: z.record(z.string()).optional(),
  network: z.string().max(40).optional(),
  minAmount: money.optional(),
  maxAmount: money.nullable().optional(),
  feePct: z.string().regex(/^\d+(\.\d{1,6})?$/).optional(),
  processingTime: z.string().max(80).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
})

export const paymentMethodUpdateSchema = paymentMethodCreateSchema.partial().omit({ type: true })

export const walletAddressCreateSchema = z.object({
  paymentMethodId: z.string().uuid().optional(),
  label: z.string().min(2).max(80),
  network: z.string().min(2).max(40),
  address: z.string().min(6).max(200),
  memo: z.string().max(120).optional(),
  qrCodeKey: z.string().max(400).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export const walletAddressUpdateSchema = walletAddressCreateSchema.partial()

export type CreateDepositInput = z.infer<typeof createDepositSchema>
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>
