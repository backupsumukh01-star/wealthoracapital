import { adminOpsMetricsService } from '../services/admin-ops-metrics.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

export const adminOpsMetricsController = {
  summary: asyncHandler(async (_req, res) => {
    sendSuccess(res, await adminOpsMetricsService.summary())
  }),
}
