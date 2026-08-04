import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'

export type EmailTemplate = {
  id: string
  key: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string | null
  variables: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type EmailOutboxItem = {
  id: string
  templateKey: string | null
  to: string
  subject: string
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  attempts: number
  lastError: string | null
  scheduledAt: string | null
  sentAt: string | null
  openedAt: string | null
  clickedAt: string | null
  createdAt: string
}

/** Admin email engine — DB-managed templates + outbox. Thin client over `/admin/email-templates` + `/admin/emails`. */
export const emailAdminService = {
  listTemplates: (query?: { q?: string }) => {
    const qs = query?.q ? `?q=${encodeURIComponent(query.q)}` : ''
    return apiClient<{ items: EmailTemplate[] }>(`${API_ROUTES.admin.emailTemplates}${qs}`)
  },

  getTemplate: (id: string) => apiClient<EmailTemplate>(`${API_ROUTES.admin.emailTemplates}/${id}`),

  createTemplate: (body: { key: string; name: string; subject: string; bodyHtml: string; bodyText?: string }) =>
    apiClient<EmailTemplate>(API_ROUTES.admin.emailTemplates, { method: 'POST', body }),

  updateTemplate: (id: string, body: Partial<{ name: string; subject: string; bodyHtml: string; bodyText: string; isActive: boolean }>) =>
    apiClient<EmailTemplate>(`${API_ROUTES.admin.emailTemplates}/${id}`, { method: 'PATCH', body }),

  listVersions: (id: string) =>
    apiClient<{ items: Array<{ id: string; version: number; createdAt: string }> }>(
      `${API_ROUTES.admin.emailTemplates}/${id}/versions`,
    ),

  preview: (id: string, variables: Record<string, string>) =>
    apiClient<{ subject: string; html: string; text: string }>(`${API_ROUTES.admin.emailTemplates}/${id}/preview`, {
      method: 'POST',
      body: { variables },
    }),

  listOutbox: (query?: { status?: string }) => {
    const qs = query?.status ? `?status=${query.status}` : ''
    return apiClient<{ items: EmailOutboxItem[] }>(`${API_ROUTES.admin.emails}${qs}`)
  },

  getOutboxItem: (id: string) => apiClient<EmailOutboxItem>(`${API_ROUTES.admin.emails}/${id}`),

  retryOutboxItem: (id: string) => apiClient<EmailOutboxItem>(`${API_ROUTES.admin.emails}/${id}/retry`, { method: 'POST' }),

  cancelOutboxItem: (id: string) => apiClient<EmailOutboxItem>(`${API_ROUTES.admin.emails}/${id}/cancel`, { method: 'POST' }),

  sendTest: (body: { templateKey: string; to: string; variables?: Record<string, string> }) =>
    apiClient<EmailOutboxItem>(`${API_ROUTES.admin.emails}/test`, { method: 'POST', body }),

  processQueue: () => apiClient<{ processed: number; sent: number; failed: number }>(`${API_ROUTES.admin.emails}/process-queue`, {
    method: 'POST',
  }),
}
