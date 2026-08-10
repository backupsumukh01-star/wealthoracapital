import { marketDataService } from '../services/market/market-data.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

export const marketController = {
  quotes: asyncHandler(async (_req, res) => {
    sendSuccess(res, await marketDataService.getQuotes())
  }),

  status: asyncHandler(async (_req, res) => {
    sendSuccess(res, await marketDataService.getStatus())
  }),
}
