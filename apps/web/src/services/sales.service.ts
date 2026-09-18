import { API_ROUTES } from '@meridian/shared'

import { salesApiClient } from '@/features/sales/sales-api-client'
import type {
  SalesLoginResponse,
  SalesMeResponse,
  SalesNetworkMembersResponse,
  SalesNetworkSummaryResponse,
} from '@/features/sales/types'

/** Salesman-authenticated APIs. Cookies carry the session; tokens never enter JS. */
export const salesService = {
  login: (body: { email: string; password: string }) =>
    salesApiClient<SalesLoginResponse>(API_ROUTES.sales.auth.login, {
      method: 'POST',
      body,
    }),

  logout: () =>
    salesApiClient<null>(API_ROUTES.sales.auth.logout, {
      method: 'POST',
    }),

  me: () => salesApiClient<SalesMeResponse>(API_ROUTES.sales.me),

  networkMembers: () =>
    salesApiClient<SalesNetworkMembersResponse>(API_ROUTES.sales.meNetworkMembers),

  networkSummary: () =>
    salesApiClient<SalesNetworkSummaryResponse>(API_ROUTES.sales.meNetworkSummary),
}
