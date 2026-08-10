import type { z } from 'zod'

import { currencyServiceHandlers } from '../services/finance/currency-handlers.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type { convertQuerySchema } from '../validators/currency.validators.js'

type ConvertQuery = z.infer<typeof convertQuerySchema>

export const currencyController = {
  rates: asyncHandler(async (_req, res) => {
    sendSuccess(res, await currencyServiceHandlers.getRates())
  }),

  convert: asyncHandler(async (req, res) => {
    const query = req.query as unknown as ConvertQuery
    sendSuccess(res, await currencyServiceHandlers.convert(query.amountUsd, query.to))
  }),

  mePreference: asyncHandler(async (req, res) => {
    sendSuccess(res, await currencyServiceHandlers.getMyPreference(req.user!.id))
  }),

  updateMePreference: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await currencyServiceHandlers.updateMyPreference(
        req.user!.id,
        req.body as { displayCurrency: string },
        requestContext(req),
      ),
    )
  }),
}
