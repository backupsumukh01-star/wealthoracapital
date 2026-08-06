import { z } from 'zod'

const money = z.string().regex(/^-?\d+(\.\d{1,8})?$/)
const pct = z.string().regex(/^-?\d+(\.\d{1,6})?$/)

export const tradeIdParamSchema = z.object({ id: z.string().uuid() })

export const createTradeSchema = z.object({
  pair: z.string().min(3).max(20),
  direction: z.enum(['BUY', 'SELL']),
  entryPrice: money,
  exitPrice: money.optional(),
  stopLoss: money.optional(),
  takeProfit: money.optional(),
  lotSize: money.optional(),
  leverage: money.optional(),
  strategy: z.string().max(80).optional(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openTime: z.string().datetime().optional(),
  adminNotes: z.string().max(2000).optional(),
  returnPct: pct.optional(),
})

export const updateTradeSchema = createTradeSchema.partial()

export const closeTradeSchema = z.object({
  exitPrice: money.optional(),
  returnPct: pct.optional(),
  adminNotes: z.string().max(2000).optional(),
})

export const allocateTradeSchema = z.object({
  tradeId: z.string().uuid(),
  mode: z.enum(['EQUAL', 'PERCENTAGE', 'CAPITAL', 'MANUAL']),
  userIds: z.array(z.string().uuid()).optional(),
  allocations: z
    .array(
      z.object({
        userId: z.string().uuid(),
        amount: money.optional(),
        pct: pct.optional(),
      }),
    )
    .optional(),
})

export const publishReturnSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnPct: pct,
  idempotencyKey: z.string().min(8).max(120),
  returnBasis: z.enum(['BALANCE', 'INVESTED']).optional(),
  preview: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
})

export const adminTradeListQuerySchema = z.object({
  q: z.string().max(120).optional(),
  status: z
    .enum(['DRAFT', 'SCHEDULED', 'OPEN', 'RUNNING', 'CLOSED', 'CANCELLED', 'ARCHIVED'])
    .optional(),
  pair: z.string().max(20).optional(),
  strategy: z.string().max(80).optional(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const tradeListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  outcome: z.enum(['WIN', 'LOSS', 'BREAKEVEN']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const seriesQuerySchema = z.object({
  range: z.string().default('30d'),
})
