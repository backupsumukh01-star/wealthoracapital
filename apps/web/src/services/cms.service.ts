import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'
import type { CmsPublicBootstrap, PlatformCmsDocument } from '@/types/domain'

export type CmsDocumentEnvelope = {
  status: string
  version: number
  updatedAt: string
  publishedAt: string | null
  scheduledAt: string | null
  content: Record<string, unknown>
  publishedContent: unknown
  scheduledContent: unknown
}

export type CmsFaq = {
  id: string
  question: string
  answer: string
  category?: string | null
  order: number
  status?: string
}

export type CmsTestimonial = {
  id: string
  name: string
  country: string | null
  quote: string
  rating: number
  platform: string | null
  photoUrl: string | null
  enabled: boolean
  order: number
}

export type CmsAnnouncement = {
  id: string
  type: string
  title: string
  body: string
  priority: string
  displayPage: string
  color: string | null
  sticky: boolean
  popup: boolean
  status: string
  scheduledAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type CmsPage = {
  id: string
  slug: string
  title: string
  body: string
  status: string
  publishedAt: string | null
}

export type CmsRevision = {
  id: string
  documentKey?: string
  action?: string
  label?: string
  note?: string
  version?: number
  createdAt: string
  actorEmail?: string | null
}

export type CmsPublicAnnouncement = {
  id: string
  type: string
  title: string
  body: string
  priority: string
  displayPage: string
  color: string | null
  sticky: boolean
  popup: boolean
  expiresAt: string | null
}

export type CmsPublicPage = {
  id: string
  slug: string
  title: string
  body: string
  updatedAt?: string
}

/** Public + admin CMS endpoints. */
export const cmsService = {
  publicBootstrap: () => apiClient<CmsPublicBootstrap>(API_ROUTES.cms.public),

  publicAnnouncements: () =>
    apiClient<{ items: CmsPublicAnnouncement[] }>(`${API_ROUTES.cms.public}/announcements`),

  publicPage: (slug: string) => apiClient<CmsPublicPage>(`${API_ROUTES.cms.public}/pages/${slug}`),

  getLanding: () => apiClient<CmsDocumentEnvelope>(API_ROUTES.cms.landing),

  updateLandingDraft: (body: Record<string, unknown>) =>
    apiClient<CmsDocumentEnvelope>(API_ROUTES.cms.landing, { method: 'PUT', body }),

  publishLanding: (content?: Record<string, unknown>) =>
    apiClient<CmsDocumentEnvelope>(`${API_ROUTES.cms.landing}/publish`, {
      method: 'POST',
      body: content ? { content } : {},
    }),

  landingRevisions: () =>
    apiClient<{ items: CmsRevision[] }>(`${API_ROUTES.cms.landing}/revisions`),

  getPlatform: () => apiClient<PlatformCmsDocument>(API_ROUTES.cms.platform),

  updatePlatformDraft: (body: Partial<PlatformCmsDocument> | Record<string, unknown>) =>
    apiClient<PlatformCmsDocument>(API_ROUTES.cms.platform, { method: 'PUT', body }),

  publishPlatform: (body: PlatformCmsDocument | Record<string, unknown>) =>
    apiClient<PlatformCmsDocument>(`${API_ROUTES.cms.platform}/publish`, {
      method: 'POST',
      body,
    }),

  platformRevisions: () =>
    apiClient<{ items: CmsRevision[] }>(`${API_ROUTES.cms.platform}/revisions`),

  rollbackRevision: (revisionId: string) =>
    apiClient<unknown>(API_ROUTES.cms.rollback(revisionId), { method: 'POST' }),

  // Staff CMS collection routes (not all mirrored on API_ROUTES.cms)
  faqs: {
    list: () => apiClient<{ items: CmsFaq[] }>('/cms/faqs'),
    create: (body: { question: string; answer: string; order?: number; status?: string }) =>
      apiClient<CmsFaq>('/cms/faqs', { method: 'POST', body }),
    update: (id: string, body: Partial<{ question: string; answer: string; order: number; status: string }>) =>
      apiClient<CmsFaq>(`/cms/faqs/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => apiClient<CmsFaq>(`/cms/faqs/${id}`, { method: 'DELETE' }),
  },

  testimonials: {
    list: () => apiClient<{ items: CmsTestimonial[] }>('/cms/testimonials'),
    create: (body: {
      name: string
      country?: string
      quote: string
      rating?: number
      platform?: string
      photoUrl?: string
    }) => apiClient<CmsTestimonial>('/cms/testimonials', { method: 'POST', body }),
    update: (
      id: string,
      body: Partial<{
        name: string
        country: string
        quote: string
        rating: number
        platform: string
        photoUrl: string
        enabled: boolean
      }>,
    ) => apiClient<CmsTestimonial>(`/cms/testimonials/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => apiClient<CmsTestimonial>(`/cms/testimonials/${id}`, { method: 'DELETE' }),
  },

  announcements: {
    list: () => apiClient<{ items: CmsAnnouncement[] }>('/cms/announcements'),
    create: (body: Record<string, unknown>) =>
      apiClient<CmsAnnouncement>('/cms/announcements', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiClient<CmsAnnouncement>(`/cms/announcements/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => apiClient<CmsAnnouncement>(`/cms/announcements/${id}`, { method: 'DELETE' }),
  },

  pages: {
    list: () => apiClient<{ items: CmsPage[] }>('/cms/pages'),
    get: (slug: string) => apiClient<CmsPage>(`/cms/pages/${slug}`),
    upsert: (slug: string, body: { title: string; body: string; status?: string }) =>
      apiClient<CmsPage>(`/cms/pages/${slug}`, { method: 'PUT', body }),
  },
}
