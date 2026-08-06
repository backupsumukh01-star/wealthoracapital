import { z } from 'zod'

const money = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, 'Amount must be a positive decimal string.')

/** Whole-rupee INR amount (no fractional digits). */
const inrMoney = z.string().regex(/^\d+$/, 'INR amount must be a whole-rupee integer string.')

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
  /** Optional INR snapshot from the dual-currency form; server recomputes if omitted. */
  amountInr: inrMoney.optional(),
  methodId: z.string().uuid(),
  userReference: z.string().max(120).optional(),
  txHash: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  /** Method-specific investor fields (UPI ID used, sender bank, etc.). */
  submissionDetails: z.record(z.string(), z.string().max(240)).optional(),
  idempotencyKey: z.string().min(8).max(120),
})

export const createWithdrawalSchema = z.object({
  amount: money,
  /** Optional INR snapshot from the dual-currency form; server recomputes if omitted. */
  amountInr: inrMoney.optional(),
  payoutMethodId: z.string().uuid(),
  otp: z.string().trim().min(4).max(12),
  idempotencyKey: z.string().min(8).max(120),
})

export const requestWithdrawalOtpSchema = z.object({
  amount: money,
  payoutMethodId: z.string().uuid(),
})

export const createPayoutMethodSchema = z.object({
  label: z.string().trim().min(2).max(80),
  type: z.enum(['UPI', 'BANK_TRANSFER', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH']),
  details: z.record(z.string(), z.string().trim().max(240)),
  isDefault: z.boolean().optional(),
})

export const updatePayoutMethodSchema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  details: z.record(z.string(), z.string().trim().max(240)).optional(),
  isDefault: z.boolean().optional(),
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
  type: z.enum(['UPI', 'BANK_TRANSFER', 'CRYPTO', 'MANUAL', 'OTHER']),
  instructions: z.string().min(3).max(2000),
  logoKey: z.string().max(400).nullable().optional(),
  network: z.string().max(40).nullable().optional(),
  minAmount: money.optional(),
  maxAmount: money.nullable().optional(),
  feePct: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/)
    .optional(),
  processingTime: z.string().max(80).nullable().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
  upi: z
    .object({
      upiId: z.string().min(3).max(120),
      accountHolderName: z.string().min(2).max(120),
      qrCodeKey: z.string().max(400).nullable().optional(),
    })
    .optional(),
  bank: z
    .object({
      accountHolderName: z.string().min(2).max(120),
      bankName: z.string().min(2).max(120),
      accountNumber: z.string().min(4).max(64),
      ifscCode: z.string().min(4).max(32),
      branch: z.string().max(120).nullable().optional(),
      accountType: z.string().max(40).nullable().optional(),
      qrCodeKey: z.string().max(400).nullable().optional(),
    })
    .optional(),
  cryptoWallets: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        label: z.string().min(2).max(80),
        coin: z.string().min(2).max(20),
        network: z.string().min(2).max(40),
        address: z.string().min(6).max(200),
        memo: z.string().max(120).nullable().optional(),
        instructions: z.string().max(2000).nullable().optional(),
        qrCodeKey: z.string().max(400).nullable().optional(),
        minAmount: money.nullable().optional(),
        maxAmount: money.nullable().optional(),
        sortOrder: z.number().int().min(0).max(10000).optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .optional(),
})

export const paymentMethodUpdateSchema = paymentMethodCreateSchema
  .partial()
  .omit({ type: true })
  .extend({
    upi: paymentMethodCreateSchema.shape.upi.nullable().optional(),
    bank: paymentMethodCreateSchema.shape.bank.nullable().optional(),
  })

export const paymentMethodReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(200),
})

export const walletAddressCreateSchema = z.object({
  paymentMethodId: z.string().uuid(),
  label: z.string().min(2).max(80),
  coin: z.string().min(2).max(20).default('USDT'),
  network: z.string().min(2).max(40),
  address: z.string().min(6).max(200),
  memo: z.string().max(120).nullable().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  qrCodeKey: z.string().max(400).nullable().optional(),
  minAmount: money.nullable().optional(),
  maxAmount: money.nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export const walletAddressUpdateSchema = walletAddressCreateSchema.partial().extend({
  paymentMethodId: z.string().uuid().nullable().optional(),
})

export type CreateDepositInput = z.infer<typeof createDepositSchema>
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>
export type RequestWithdrawalOtpInput = z.infer<typeof requestWithdrawalOtpSchema>
export type CreatePayoutMethodInput = z.infer<typeof createPayoutMethodSchema>
export type UpdatePayoutMethodInput = z.infer<typeof updatePayoutMethodSchema>
