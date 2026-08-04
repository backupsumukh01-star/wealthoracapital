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

  adminUpdate: (body: Partial<PlatformSettings>) =>
    apiClient<PlatformSettings>(API_ROUTES.admin.settings, { method: 'PUT', body }),

  featureFlags: () =>
    apiClient<Record<string, boolean>>(API_ROUTES.admin.featureFlags),

  updateFeatureFlags: (body: Record<string, boolean>) =>
    apiClient<Record<string, boolean>>(API_ROUTES.admin.featureFlags, {
      method: 'PUT',
      body,
    }),
}
