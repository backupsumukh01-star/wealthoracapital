'use client'

import { PageHeader } from '@/components/common/page-header'
import { Card } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

export function AdminEmailOutbox() {
  const { emails } = useInvestorLifecycle()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email outbox"
        description="Lifecycle emails queued by the demo store. Swap for a real provider later."
      />

      {emails.length === 0 ? (
        <Card className="p-8 text-center text-body-sm text-fg-muted">
          No emails sent yet. Register, verify, submit KYC, or reset a password to populate this feed.
        </Card>
      ) : (
        <ul className="space-y-3">
          {emails.map((em) => (
            <li key={em.id}>
              <Card className="space-y-1.5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-fg">{em.subject}</p>
                  <span className="text-caption text-fg-subtle">{formatDateTime(em.sentAt)}</span>
                </div>
                <p className="text-caption text-fg-muted">
                  To {em.to} · {em.template}
                </p>
                <p className="text-body-sm text-fg-subtle">{em.preview}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
