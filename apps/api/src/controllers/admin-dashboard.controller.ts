import { activityService } from '../services/activity.service.js'
import { auditService } from '../services/audit.service.js'
import { dashboardService } from '../services/dashboard.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'
import type { adminActivityQuerySchema, adminAuditQuerySchema } from '../validators/admin.validators.js'
import type { z } from 'zod'

type AuditQuery = z.infer<typeof adminAuditQuerySchema>
type ActivityQuery = z.infer<typeof adminActivityQuerySchema>

export const adminDashboardController = {
  summary: asyncHandler(async (_req, res) => {
    const data = await dashboardService.getSummary()
    sendSuccess(res, data)
  }),

  ops: asyncHandler(async (_req, res) => {
    sendSuccess(res, await dashboardService.getOpsSnapshot())
  }),

  activity: asyncHandler(async (req, res) => {
    const query = req.query as unknown as ActivityQuery
    const data = await activityService.list({
      userId: query.userId,
      kind: query.kind,
      page: query.page,
      limit: query.limit,
      cursor: query.cursor,
      sortOrder: query.sortOrder,
    })
    sendSuccess(res, data)
  }),

  audit: asyncHandler(async (req, res) => {
    const query = req.query as unknown as AuditQuery
    const data = await auditService.list({
      q: query.q,
      module: query.module,
      action: query.action,
      actorId: query.actorId,
      targetUserId: query.targetUserId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
      cursor: query.cursor,
      sortOrder: query.sortOrder,
    })
    sendSuccess(res, data)
  }),

  roles: asyncHandler(async (_req, res) => {
    const { buildPermissionMatrix, listRoleCatalog } = await import('../config/permissions.js')
    sendSuccess(res, {
      items: listRoleCatalog(),
      matrix: buildPermissionMatrix(),
    })
  }),
}
