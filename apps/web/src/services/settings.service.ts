import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'
import type { PublicSettings, PlatformSettings } from '@/types/domain'

export const settingsService = {
  public: () => apiClient<PublicSettings>(API_ROUTES.settings.public),

  me: () => apiClient<Record<string, unknown>>(API_ROUTES.settings.me),

  updateMe: (body: Record<string, unknown>) =>
    apiClient<Record<string, unknown>>(API_ROUTES.settings.me, { method: 'PATCH', body }),

  /** Admin — platform configuration */
  adminGet: () => apiClient<PlatformSettings>(API_ROUTES.admin.settings),

  adminUpdate: (body: {
    companyName?: string
    supportEmail?: string
    supportPhone?: string | null
    defaultCurrency?: string
    timezone?: string
    maintenanceMode?: boolean
    networks?: string[]
    coins?: string[]
    minDeposit?: string
    maxDeposit?: string
    minWithdrawal?: string
    maxWithdrawal?: string
    usdInrRate?: string
    currencyRates?: Record<string, string>
  }) =>
    apiClient<PlatformSettings>(API_ROUTES.admin.settings, { method: 'PUT', body }),

  featureFlags: () =>
    apiClient<Record<string, boolean>>(API_ROUTES.admin.featureFlags),

  updateFeatureFlags: (body: Record<string, boolean>) =>
    apiClient<Record<string, boolean>>(API_ROUTES.admin.featureFlags, {
      method: 'PUT',
      body,
    }),
}
