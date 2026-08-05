import { adminHealthService } from '../services/admin-health.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

export const adminHealthController = {
  snapshot: asyncHandler(async (_req, res) => {
    sendSuccess(res, await adminHealthService.snapshot())
  }),
}
