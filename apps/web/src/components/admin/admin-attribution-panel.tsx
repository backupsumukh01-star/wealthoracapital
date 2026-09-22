'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import type { AdminUserAttributionFields } from '@/components/admin/admin-api-adapters'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { resolveAdminAttributionDisplay } from '@/components/admin/admin-attribution'

type AdminAttributionPanelProps = {
  attribution: AdminUserAttributionFields | null | undefined
  className?: string
}

export function AdminAttributionPanel({ attribution, className }: AdminAttributionPanelProps) {
  const display = resolveAdminAttributionDisplay(attribution)

  return (
    <AdminPanel className={className} glow>
      <AdminPanelHeader
        title="Attribution"
        description="Referral relationship and sales attribution for this investor."
      />
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div className="space-y-2">
          <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">Referral</p>
          <dl className="grid gap-2 text-caption">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <dt className="shrink-0 text-fg-subtle">Referred By</dt>
              <dd className="text-fg sm:text-right">
                {display.referrerUserId ? (
                  <Link
                    href={ROUTES.admin.user(display.referrerUserId)}
                    className="text-accent-300 hover:underline"
                  >
                    {display.referredByLabel}
                  </Link>
                ) : (
                  display.referredByLabel
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <dt className="shrink-0 text-fg-subtle">Referral Code</dt>
              <dd className="break-all font-mono text-fg sm:text-right">{display.referralCodeLabel}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-2">
          <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">Salesman</p>
          <dl className="grid gap-2 text-caption">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <dt className="shrink-0 text-fg-subtle">Salesman</dt>
              <dd className="text-fg sm:text-right">{display.salesmanNameLabel}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <dt className="shrink-0 text-fg-subtle">Salesman Code</dt>
              <dd className="break-all font-mono text-fg sm:text-right">{display.salesmanCodeLabel}</dd>
            </div>
          </dl>
        </div>
      </div>
    </AdminPanel>
  )
}
