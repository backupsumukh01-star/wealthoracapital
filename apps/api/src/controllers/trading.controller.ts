import type { z } from 'zod'

import { distributionService } from '../services/trading/distribution.service.js'
import { performanceService } from '../services/trading/performance.service.js'
import { tradeService } from '../services/trading/trade.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  allocateTradeSchema,
  closeTradeSchema,
  createTradeSchema,
  publishReturnSchema,
  updateTradeSchema,
} from '../validators/trading.validators.js'

type CreateTrade = z.infer<typeof createTradeSchema>
type UpdateTrade = z.infer<typeof updateTradeSchema>
type CloseTrade = z.infer<typeof closeTradeSchema>
type Allocate = z.infer<typeof allocateTradeSchema>
type PublishReturn = z.infer<typeof publishReturnSchema>

export const tradingController = {
  // Investor
  listTrades: asyncHandler(async (req, res) => {
    const q = req.query as { cursor?: string; outcome?: string; limit?: string }
    sendSuccess(
      res,
      await tradeService.listInvestor(
        {
          cursor: q.cursor,
          outcome: q.outcome,
          limit: q.limit ? Number(q.limit) : undefined,
        },
        req.user!.id,
      ),
    )
  }),

  publicTrades: asyncHandler(async (req, res) => {
    const q = req.query as { cursor?: string; outcome?: string; limit?: string }
    sendSuccess(
      res,
      await tradeService.listPublic({
        cursor: q.cursor,
        outcome: q.outcome,
        limit: q.limit ? Number(q.limit) : 50,
      }),
    )
  }),

  publicStats: asyncHandler(async (_req, res) => {
    const analytics = await performanceService.analytics()
    const meta = await performanceService.publicMeta()
    sendSuccess(res, {
      winRatePct: meta.winRatePct || analytics.winRate,
      tradeCount: meta.tradeCount || analytics.closedTrades,
      avgReturnPct: analytics.averageTrade,
      openTrades: analytics.openTrades,
      closedTrades: analytics.closedTrades,
      bestTradeReturnPct: analytics.bestTrade?.returnPct ?? null,
      worstTradeReturnPct: analytics.worstTrade?.returnPct ?? null,
    })
  }),

  getTrade: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.getPublic(req.params.id!))
  }),

  pairs: asyncHandler(async (_req, res) => {
    sendSuccess(res, await tradeService.pairs())
  }),

  stats: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.stats(req.user!.id))
  }),

  performanceSummary: asyncHandler(async (req, res) => {
    sendSuccess(res, await performanceService.summary(req.user!.id))
  }),

  performanceSeries: asyncHandler(async (req, res) => {
    const range = String(req.query.range ?? '30d')
    sendSuccess(res, await performanceService.series(req.user!.id, range))
  }),

  performanceMonthly: asyncHandler(async (req, res) => {
    sendSuccess(res, await performanceService.monthly(req.user!.id))
  }),

  performanceYearly: asyncHandler(async (req, res) => {
    sendSuccess(res, await performanceService.yearly(req.user!.id))
  }),

  performanceDistributions: asyncHandler(async (req, res) => {
    sendSuccess(res, await distributionService.listInvestorDistributions(req.user!.id))
  }),

  performancePublic: asyncHandler(async (_req, res) => {
    const [summary, analytics, monthly, yearly, meta, monthlyDetail] = await Promise.all([
      performanceService.summary(),
      performanceService.analytics(),
      performanceService.monthly(),
      performanceService.yearly(),
      performanceService.publicMeta(),
      performanceService.monthlyFromDailyReturns(),
    ])
    // Always overlay programme KPIs from publicMeta (DailyReturn / trade calendar).
    // Wallet distributions can have activeDays > 0 while best/worst returnPct stay at 0.
    const mergedSummary = {
      ...summary,
      activeDays: Math.max(summary.activeDays, meta.tradingDayCount),
      winRatePct: meta.winRatePct || summary.winRatePct,
      avgDailyReturnPct:
        meta.tradingDayCount > 0
          ? (Number(meta.totalReturnPct) / meta.tradingDayCount).toFixed(6)
          : summary.avgDailyReturnPct,
      bestDay: meta.bestDay
        ? { date: meta.bestDay.date, returnPct: meta.bestDay.returnPct, profit: '0' }
        : summary.bestDay,
      worstDay: meta.worstDay
        ? { date: meta.worstDay.date, returnPct: meta.worstDay.returnPct, profit: '0' }
        : summary.worstDay,
      roiPct: meta.totalReturnPct || summary.roiPct,
    }
    sendSuccess(res, {
      summary: mergedSummary,
      analytics: {
        ...analytics,
        winRate: meta.winRatePct || analytics.winRate,
        closedTrades: meta.tradeCount || analytics.closedTrades,
        bestTrade: meta.bestDay
          ? { ...(analytics.bestTrade ?? {}), returnPct: meta.bestDay.returnPct }
          : analytics.bestTrade,
        worstTrade: meta.worstDay
          ? { ...(analytics.worstTrade ?? {}), returnPct: meta.worstDay.returnPct }
          : analytics.worstTrade,
      },
      monthly: monthlyDetail.length >= monthly.length ? monthlyDetail : monthly,
      yearly,
      monthlyDetail,
      meta,
    })
  }),

  portfolio: asyncHandler(async (req, res) => {
    sendSuccess(res, await performanceService.portfolio(req.user!.id))
  }),

  returns: asyncHandler(async (req, res) => {
    sendSuccess(res, await distributionService.listInvestorReturns(req.user!.id))
  }),

  // Admin trades
  adminListTrades: asyncHandler(async (req, res) => {
    const q = req.query as unknown as {
      q?: string
      status?: string
      pair?: string
      strategy?: string
      risk?: string
      from?: Date
      to?: Date
      page: number
      limit: number
    }
    sendSuccess(
      res,
      await tradeService.adminList({
        q: q.q,
        status: q.status as never,
        pair: q.pair,
        strategy: q.strategy,
        risk: q.risk as never,
        from: q.from,
        to: q.to,
        page: q.page,
        limit: q.limit,
      }),
    )
  }),

  adminGetTrade: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.adminGet(req.params.id!))
  }),

  adminCreateTrade: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tradeService.create(req.user!.id, req.body as CreateTrade, requestContext(req)),
    )
  }),

  adminUpdateTrade: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tradeService.update(
        req.user!.id,
        req.params.id!,
        req.body as UpdateTrade,
        requestContext(req),
      ),
    )
  }),

  adminOpenTrade: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.open(req.user!.id, req.params.id!, requestContext(req)))
  }),

  adminCloseTrade: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tradeService.close(
        req.user!.id,
        req.params.id!,
        req.body as CloseTrade,
        requestContext(req),
      ),
    )
  }),

  adminCancelTrade: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.cancel(req.user!.id, req.params.id!, requestContext(req)))
  }),

  adminArchiveTrade: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.archive(req.user!.id, req.params.id!, requestContext(req)))
  }),

  adminDuplicateTrade: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tradeService.duplicate(req.user!.id, req.params.id!, requestContext(req)),
    )
  }),

  adminPublishTrade: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.publish(req.user!.id, req.params.id!, requestContext(req)))
  }),

  adminHideTrade: asyncHandler(async (req, res) => {
    sendSuccess(res, await tradeService.hide(req.user!.id, req.params.id!, requestContext(req)))
  }),

  adminAllocate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await tradeService.allocate(req.user!.id, req.body as Allocate, requestContext(req)),
    )
  }),

  adminPublishBatch: asyncHandler(async (req, res) => {
    const body = req.body as { tradeIds?: string[] }
    const ids = body.tradeIds ?? []
    const items = []
    for (const id of ids) {
      items.push(await tradeService.publish(req.user!.id, id, requestContext(req)))
    }
    sendSuccess(res, { items })
  }),

  adminReturns: asyncHandler(async (_req, res) => {
    sendSuccess(res, await distributionService.listRuns())
  }),

  adminPublishReturn: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await distributionService.publishReturn(
        req.user!.id,
        req.body as PublishReturn,
        requestContext(req),
      ),
    )
  }),

  adminPerformance: asyncHandler(async (_req, res) => {
    const [summary, analytics, dailyReturns] = await Promise.all([
      performanceService.summary(),
      performanceService.analytics(),
      distributionService.listDailyReturns(),
    ])
    sendSuccess(res, {
      summary,
      analytics,
      // Frontend expects an array; listDailyReturns returns { items }.
      dailyReturns: Array.isArray(dailyReturns) ? dailyReturns : (dailyReturns.items ?? []),
    })
  }),
}
