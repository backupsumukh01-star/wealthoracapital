'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { cn } from '@/lib/cn'
import { settingsService } from '@/services/settings.service'
import { cmsQueryKeys } from '@/features/cms/hooks'

const LABELS: Record<string, string> = {
  registration: 'Registration',
  login: 'Login',
  deposit: 'Deposits',
  withdrawal: 'Withdrawals',
  returns: 'Returns',
  referral: 'Referrals',
  support: 'Support',
  trading: 'Trading',
  maintenance: 'Maintenance mode',
  reports: 'Reports',
  notifications: 'Notifications',
  email: 'Email',
}

const DEFAULT_KEYS = Object.keys(LABELS)

export function AdminFeatureTogglesWorkspace() {
  const qc = useQueryClient()
  const { data: flags = {} } = useQuery({
    queryKey: [...cmsQueryKeys.all, 'feature-flags'],
    queryFn: () => settingsService.featureFlags(),
  })

  const keys = Array.from(new Set([...DEFAULT_KEYS, ...Object.keys(flags)])).filter(
    (key) => key !== 'kyc',
  )

  const updateMutation = useMutation({
    mutationFn: (next: Record<string, boolean>) => settingsService.updateFeatureFlags(next),
    onSuccess: (data) => {
      qc.setQueryData([...cmsQueryKeys.all, 'feature-flags'], data)
      qc.invalidateQueries({ queryKey: cmsQueryKeys.bootstrap() })
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update flag'),
  })

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Feature Toggles"
        description="One-click enable/disable for platform capabilities. Synced with global settings."
      />

      <AdminPanel>
        <AdminPanelHeader title="Switches" />
        <ul className="divide-y divide-white/[0.04]">
          {keys.map((key) => {
            const on = Boolean(flags[key])
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5"
              >
                <div>
                  <p className="font-medium text-fg">{LABELS[key] ?? key}</p>
                  <p className="text-caption text-fg-subtle">{key}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    const next = { ...flags, [key]: !on, kyc: true }
                    updateMutation.mutate(next)
                    toast.message(`${LABELS[key] ?? key} ${!on ? 'enabled' : 'disabled'}`)
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
