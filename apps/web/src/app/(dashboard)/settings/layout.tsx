import type { ReactNode } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { SettingsNav } from '@/components/dashboard/settings-nav'

/** Settings share one heading and sub-navigation; each child owns its panel. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 max-w-full space-y-5 sm:space-y-6 lg:space-y-8">
      <PageHeader
        className="pb-2 sm:pb-4"
        title="Profile & settings"
        description="Account controls — identity, payouts, security, and preferences."
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[200px_1fr] lg:gap-8">
        <SettingsNav />
        <div className="min-w-0 max-w-full space-y-4 sm:space-y-5">{children}</div>
      </div>
    </div>
  )
}
