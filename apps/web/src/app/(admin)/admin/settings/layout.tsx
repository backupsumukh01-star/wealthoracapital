import type { ReactNode } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { AdminSettingsNav } from '@/components/admin/admin-settings-nav'

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform settings"
        description="Operating limits, payment methods, staff access, and the templates the platform sends."
      />

      <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
        <AdminSettingsNav />
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </div>
  )
}
