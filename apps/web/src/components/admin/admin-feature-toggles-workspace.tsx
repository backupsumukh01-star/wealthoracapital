'use client'

import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'
import type { FeatureToggles } from '@/lib/admin-os-store'

const LABELS: Record<keyof FeatureToggles, string> = {
  registration: 'Registration',
  login: 'Login',
  deposit: 'Deposits',
  withdrawal: 'Withdrawals',
  returns: 'Returns',
  referral: 'Referrals',
  support: 'Support',
  trading: 'Trading',
  maintenance: 'Maintenance mode',
  kyc: 'KYC',
  reports: 'Reports',
  notifications: 'Notifications',
  email: 'Email',
}

export function AdminFeatureTogglesWorkspace() {
  const { state, updateToggles } = useAdminOs()

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Feature Toggles"
        description="One-click enable/disable for platform capabilities. Synced with global settings."
      />

      <AdminPanel>
        <AdminPanelHeader title="Switches" />
        <ul className="divide-y divide-white/[0.04]">
          {(Object.keys(LABELS) as Array<keyof FeatureToggles>).map((key) => {
            const on = state.toggles[key]
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5"
              >
                <div>
                  <p className="font-medium text-fg">{LABELS[key]}</p>
                  <p className="text-caption text-fg-subtle">{key}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => {
                    updateToggles({ [key]: !on })
                    toast.message(`${LABELS[key]} ${!on ? 'enabled' : 'disabled'}`)
                  }}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors',
                    on ? 'border-accent-500/50 bg-accent-500/40' : 'border-white/15 bg-white/10',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 size-5 rounded-full bg-fg transition-transform',
                      on ? 'left-[1.35rem]' : 'left-0.5',
                    )}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </AdminPanel>
    </div>
  )
}
