import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'
import type { CmsPublicBootstrap, PlatformCmsDocument } from '@/types/domain'

/** Public + admin CMS endpoints. */
export const cmsService = {
  publicBootstrap: () => apiClient<CmsPublicBootstrap>(API_ROUTES.cms.public),

  getLanding: () => apiClient<unknown>(API_ROUTES.cms.landing),

  publishLanding: (body: unknown) =>
    apiClient<unknown>(`${API_ROUTES.cms.landing}/publish`, { method: 'POST', body }),

  getPlatform: () => apiClient<PlatformCmsDocument>(API_ROUTES.cms.platform),

  updatePlatformDraft: (body: Partial<PlatformCmsDocument>) =>
    apiClient<PlatformCmsDocument>(API_ROUTES.cms.platform, { method: 'PUT', body }),

  publishPlatform: (body: PlatformCmsDocument) =>
    apiClient<PlatformCmsDocument>(`${API_ROUTES.cms.platform}/publish`, {
      method: 'POST',
      body,
    }),

  rollbackRevision: (revisionId: string) =>
    apiClient<unknown>(`${API_ROUTES.cms.public}/revisions/${revisionId}/rollback`, {
      method: 'POST',
    }),
}
