import type { z } from 'zod'

import { reportService } from '../services/report/report.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type { adminGenerateReportSchema, exportReportSchema, reportListQuerySchema } from '../validators/report.validators.js'

export const reportController = {
  export: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof exportReportSchema>
    const result = await reportService.generate(
      req.user!.id,
      { ...body, scope: 'INVESTOR' },
      requestContext(req),
    )
    sendSuccess(res, { jobId: result.jobId, downloadUrl: result.downloadUrl }, 201)
  }),

  adminGenerate: asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof adminGenerateReportSchema>
    sendSuccess(res, await reportService.generate(req.user!.id, body, requestContext(req)), 201)
  }),

  adminList: asyncHandler(async (req, res) => {
    sendSuccess(res, await reportService.list(req.query as z.infer<typeof reportListQuerySchema>))
  }),

  adminGet: asyncHandler(async (req, res) => {
    sendSuccess(res, await reportService.get(req.params.id!))
  }),
}
