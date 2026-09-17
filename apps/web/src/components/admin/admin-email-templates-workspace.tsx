'use client'

import { toast } from 'sonner'

import { PremiumEmailPreviewStudio } from '@/components/common/premium-email-preview'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { useAdminOs } from '@/providers/admin-os-provider'
import {
  type PremiumEmailKey,
  PREMIUM_EMAIL_CATALOG,
  renderPremiumEmail,
} from '@/lib/premium-email-templates'

export function AdminEmailTemplatesWorkspace() {
  const { updateEmailTemplate, state } = useAdminOs()

  function syncCatalogToStore() {
    for (const meta of PREMIUM_EMAIL_CATALOG) {
      const existing = state.emailTemplates.find((t) => t.key === meta.key)
      updateEmailTemplate({
        id: existing?.id ?? `EM_${meta.key}`,
        key: meta.key,
        name: meta.name,
        subject: meta.subject,
        bodyHtml: renderPremiumEmail(meta.key as PremiumEmailKey),
        updatedAt: new Date().toISOString(),
      })
    }
    toast.success('All 25 premium templates synced to Admin OS store')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Premium Email Templates"
        description="25 unique fintech layouts — Stripe/Revolut-grade HTML with Desktop and Mobile preview."
        actions={
          <Button type="button" variant="glass" size="sm" onClick={syncCatalogToStore}>
            Sync templates to store
          </Button>
        }
      />

      <AdminPanel>
        <AdminPanelHeader
          title="Template studio"
          description="Each email has its own colors, illustration, and layout while keeping Wealthora identity."
        />
        <div className="p-4 sm:p-5">
          <PremiumEmailPreviewStudio showEditor />
        </div>
      </AdminPanel>
    </div>
  )
}
