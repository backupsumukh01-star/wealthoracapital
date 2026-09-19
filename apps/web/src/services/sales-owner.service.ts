import { API_ROUTES } from '@meridian/shared'

import { apiClient } from '@/lib/api-client'
import type {
  SalesNetworkMemberDetail,
  SalesNetworkMembersResponse,
  SalesNetworkSummaryResponse,
  SalesOwnerSalesmanMutationResponse,
  SalesOwnerSalesmenResponse,
} from '@/features/sales/types'

/**
 * Sales Owner APIs. These use the existing Admin/Super Admin session (`mfx_at`)
 * and the investor/admin refresh path — never salesman cookies.
 */
export const salesOwnerService = {
  listSalesmen: () =>
    apiClient<SalesOwnerSalesmenResponse>(API_ROUTES.sales.ownerSalesmen),

  createSalesman: (body: { name: string; email: string; code?: string }) =>
    apiClient<SalesOwnerSalesmanMutationResponse>(API_ROUTES.sales.ownerSalesmen, {
      method: 'POST',
      body,
    }),

  updateSalesman: (
    salesmanId: string,
    body: { name?: string; email?: string; status?: 'ACTIVE' | 'DISABLED' },
  ) =>
    apiClient<SalesOwnerSalesmanMutationResponse>(API_ROUTES.sales.ownerSalesman(salesmanId), {
      method: 'PATCH',
      body,
    }),

  resetPassword: (salesmanId: string) =>
    apiClient<SalesOwnerSalesmanMutationResponse>(API_ROUTES.sales.ownerSalesmanPassword(salesmanId), {
      method: 'POST',
    }),

  networkMembers: (salesmanId: string) =>
    apiClient<SalesNetworkMembersResponse>(API_ROUTES.sales.ownerNetworkMembers(salesmanId)),

  networkMember: (salesmanId: string, userId: string) =>
    apiClient<SalesNetworkMemberDetail>(API_ROUTES.sales.ownerNetworkMember(salesmanId, userId)),

  networkSummary: (salesmanId: string) =>
    apiClient<SalesNetworkSummaryResponse>(API_ROUTES.sales.ownerNetworkSummary(salesmanId)),
}
