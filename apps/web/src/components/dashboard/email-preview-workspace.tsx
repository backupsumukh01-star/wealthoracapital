'use client'

import { PremiumEmailPreviewStudio } from '@/components/common/premium-email-preview'
import { PageHeader } from '@/components/common/page-header'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

/** Investor-facing email preview center — full premium catalog. */
export function EmailPreviewWorkspace() {
  const { session, emails } = useInvestorLifecycle()
  const sample = {
    firstName: session?.firstName ?? 'Ayesha',
    userId: session?.userId ?? 'GRZ-100001',
    username: session ? `@${session.username}` : '@ayesha',
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Email preview"
        description="Premium branded templates for every lifecycle event — unique layouts, desktop & mobile."
      />

      <PremiumEmailPreviewStudio sample={sample} />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <p className="text-body-sm font-medium text-fg">Demo outbox ({emails.length})</p>
        {emails.length === 0 ? (
          <p className="mt-3 text-caption text-fg-subtle">
            Register, verify, submit KYC, or move money to populate the outbox.
          </p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {emails.slice(0, 12).map((em) => (
              <li key={em.id} className="rounded-lg border border-line/60 px-3 py-2 text-caption">
                <p className="font-medium text-fg">{em.subject}</p>
                <p className="text-fg-subtle">
                  {em.to} · {em.template}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
