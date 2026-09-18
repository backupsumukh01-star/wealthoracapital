import { salesNetworkService } from '../services/sales-network.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

export const salesNetworkController = {
  meNetwork: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getNetwork(req.salesman!.id)
    sendSuccess(res, data)
  }),

  meMembers: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getNetwork(req.salesman!.id)
    sendSuccess(res, { salesman: data.salesman, members: data.members })
  }),

  meSummary: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getNetwork(req.salesman!.id)
    sendSuccess(res, { salesman: data.salesman, summary: data.summary })
  }),

  ownerSalesmen: asyncHandler(async (_req, res) => {
    const data = await salesNetworkService.listSalesmen()
    sendSuccess(res, data)
  }),

  ownerNetwork: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getNetwork(req.params.salesmanId!)
    sendSuccess(res, data)
  }),

  ownerMembers: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getNetwork(req.params.salesmanId!)
    sendSuccess(res, { salesman: data.salesman, members: data.members })
  }),

  ownerSummary: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getNetwork(req.params.salesmanId!)
    sendSuccess(res, { salesman: data.salesman, summary: data.summary })
  }),

  meMemberDetail: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getMemberDetail(req.salesman!.id, req.params.userId!)
    sendSuccess(res, data)
  }),

  ownerMemberDetail: asyncHandler(async (req, res) => {
    const data = await salesNetworkService.getMemberDetail(
      req.params.salesmanId!,
      req.params.userId!,
    )
    sendSuccess(res, data)
  }),
}