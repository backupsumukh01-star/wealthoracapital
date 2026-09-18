import { API_ROUTES } from '@meridian/shared'

import { apiClient } from '@/lib/api-client'
import type {
  SalesNetworkMembersResponse,
  SalesNetworkSummaryResponse,
  SalesOwnerSalesmenResponse,
} from '@/features/sales/types'

/**
 * Sales Owner APIs. These use the existing Admin/Super Admin session (`mfx_at`)
 * and the investor/admin refresh path — never salesman cookies.
 */
export const salesOwnerService = {
  listSalesmen: () =>
    apiClient<SalesOwnerSalesmenResponse>(API_ROUTES.sales.ownerSalesmen),

  networkMembers: (salesmanId: string) =>
    apiClient<SalesNetworkMembersResponse>(API_ROUTES.sales.ownerNetworkMembers(salesmanId)),

  networkSummary: (salesmanId: string) =>
    apiClient<SalesNetworkSummaryResponse>(API_ROUTES.sales.ownerNetworkSummary(salesmanId)),
}
