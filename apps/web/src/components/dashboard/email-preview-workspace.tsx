'use client'

import { PremiumEmailPreviewStudio } from '@/components/common/premium-email-preview'
import { PageHeader } from '@/components/common/page-header'
import { displayUsername } from '@/lib/investor-lifecycle'
import { useSession } from '@/providers/session-provider'

/** Investor-facing email preview center — template catalog only (no lifecycle outbox). */
export function EmailPreviewWorkspace() {
  const { session } = useSession()
  const emailLocal = session?.user.email.split('@')[0] ?? 'investor'
  const sample = {
    firstName: session?.user.firstName ?? 'Investor',
    userId: session?.user.id ?? '—',
    username: displayUsername(emailLocal),
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Email preview"
        description="Premium branded templates for account events — unique layouts, desktop & mobile."
      />

      <PremiumEmailPreviewStudio sample={sample} />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <p className="text-body-sm font-medium text-fg">Outbox</p>
        <p className="mt-3 text-caption text-fg-subtle">
          Sent email history is no longer stored in the demo lifecycle. Check your inbox for
          verification and transactional messages from the API.
        </p>
      </div>
    </div>
  )
}
