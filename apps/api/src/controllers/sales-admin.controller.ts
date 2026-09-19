import { salesAdminService } from '../services/sales-admin.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  createSalesmanSchema,
  updateSalesmanSchema,
} from '../validators/sales.validators.js'
import type { z } from 'zod'

type CreateBody = z.infer<typeof createSalesmanSchema>
type UpdateBody = z.infer<typeof updateSalesmanSchema>

export const salesAdminController = {
  create: asyncHandler(async (req, res) => {
    const data = await salesAdminService.create(
      req.body as CreateBody,
      req.user!.id,
      requestContext(req),
    )
    sendSuccess(res, data, 201)
  }),

  update: asyncHandler(async (req, res) => {
    const data = await salesAdminService.update(
      req.params.salesmanId!,
      req.body as UpdateBody,
      req.user!.id,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const data = await salesAdminService.resetPassword(
      req.params.salesmanId!,
      req.user!.id,
      requestContext(req),
    )
    sendSuccess(res, data)
  }),
}
