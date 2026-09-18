'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useAdminOs } from '@/providers/admin-os-provider'
import { ApiError } from '@/lib/api-client'
import { settingsService } from '@/services/settings.service'

export function AdminGlobalSettingsWorkspace() {
  const { state, updateGlobal, updateToggles, updateSiteSeo } = useAdminOs()
  const g = state.global
  const seo = state.siteSeo
  const queryClient = useQueryClient()
  const { data: platform, isLoading: limitsLoading } = useQuery({
    queryKey: ['admin', 'settings', 'platform'],
    queryFn: () => settingsService.adminGet(),
  })
  const [minDeposit, setMinDeposit] = useState('')
  const [maxDeposit, setMaxDeposit] = useState('')
  const [minWithdraw, setMinWithdraw] = useState('')
  const [maxWithdraw, setMaxWithdraw] = useState('')
  const [limitsHydrated, setLimitsHydrated] = useState(false)
  const [savingLimits, setSavingLimits] = useState(false)

  useEffect(() => {
    if (!platform || limitsHydrated) return
    setMinDeposit(platform.limits.minDeposit)
    setMaxDeposit(platform.limits.maxDeposit)
    setMinWithdraw(platform.limits.minWithdrawal)
    setMaxWithdraw(platform.limits.maxWithdrawal)
    setLimitsHydrated(true)
  }, [platform, limitsHydrated])

  async function saveFinancialLimits() {
    setSavingLimits(true)
    try {
      const updated = await settingsService.adminUpdate({
        minDeposit: minDeposit.trim(),
        maxDeposit: maxDeposit.trim(),
        minWithdrawal: minWithdraw.trim(),
        maxWithdrawal: maxWithdraw.trim(),
      })
      setMinDeposit(updated.limits.minDeposit)
      setMaxDeposit(updated.limits.maxDeposit)
      setMinWithdraw(updated.limits.minWithdrawal)
      setMaxWithdraw(updated.limits.maxWithdrawal)
      toast.success('Deposit and withdrawal limits saved')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'platform'] })
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Could not save deposit / withdrawal limits',
      )
    } finally {
      setSavingLimits(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="System Settings"
        description="Company, limits, channels, language, and platform switches — central configuration."
      />

      <AdminPanel>
        <AdminPanelHeader title="Company & brand" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Company name">
            <Input value={g.companyName} onChange={(e) => updateGlobal({ companyName: e.target.value })} />
          </FormField>
          <FormField label="Logo URL">
            <Input value={g.logoUrl} onChange={(e) => updateGlobal({ logoUrl: e.target.value })} />
          </FormField>
          <FormField label="Company address" className="sm:col-span-2">
            <Input
              value={seo.companyAddress}
              onChange={(e) => updateSiteSeo({ companyAddress: e.target.value })}
            />
          </FormField>
          <FormField label="Theme">
            <Input value={g.theme} disabled />
          </FormField>
          <FormField label="Default currency">
            <Input
              value={g.defaultCurrency}
              onChange={(e) => updateGlobal({ defaultCurrency: e.target.value })}
            />
          </FormField>
          <FormField label="Default language">
            <Input
              value={seo.defaultLanguage}
              onChange={(e) => updateSiteSeo({ defaultLanguage: e.target.value })}
            />
          </FormField>
          <FormField label="Timezone">
            <Input value={g.timezone} onChange={(e) => updateGlobal({ timezone: e.target.value })} />
          </FormField>
          <FormField label="Business hours">
            <Input
              value={seo.supportHours}
              onChange={(e) => updateSiteSeo({ supportHours: e.target.value })}
            />
          </FormField>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Support channels" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Support email">
            <Input
              value={g.supportEmail}
              onChange={(e) => {
                updateGlobal({ supportEmail: e.target.value })
                updateSiteSeo({ supportEmail: e.target.value })
              }}
            />
          </FormField>
          <FormField label="Support phone">
            <Input
              value={seo.supportPhone}
              onChange={(e) => updateSiteSeo({ supportPhone: e.target.value })}
            />
          </FormField>
          {(
            [
              ['supportWhatsApp', 'WhatsApp'],
              ['telegram', 'Telegram'],
              ['discord', 'Discord'],
              ['facebook', 'Facebook'],
              ['instagram', 'Instagram'],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label}>
              <Input value={g[key]} onChange={(e) => updateGlobal({ [key]: e.target.value })} />
            </FormField>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Financial limits"
          description="Saved to production. New deposits and withdrawals use these amounts immediately."
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
          <FormField label="Min deposit (USD)">
            <Input
              inputMode="decimal"
              value={minDeposit}
              disabled={limitsLoading || !limitsHydrated}
              onChange={(e) => setMinDeposit(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </FormField>
          <FormField label="Max deposit (USD)">
            <Input
              inputMode="decimal"
              value={maxDeposit}
              disabled={limitsLoading || !limitsHydrated}
              onChange={(e) => setMaxDeposit(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </FormField>
          <FormField label="Min withdrawal (USD)">
            <Input
              inputMode="decimal"
              value={minWithdraw}
              disabled={limitsLoading || !limitsHydrated}
              onChange={(e) => setMinWithdraw(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </FormField>
          <FormField label="Max withdrawal (USD)">
            <Input
              inputMode="decimal"
              value={maxWithdraw}
              disabled={limitsLoading || !limitsHydrated}
              onChange={(e) => setMaxWithdraw(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </FormField>
          <FormField label="Supported coins">
            <Input
              value={g.supportedCoins.join(', ')}
              onChange={(e) =>
                updateGlobal({
                  supportedCoins: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </FormField>
          <FormField label="Supported networks">
            <Input
              value={g.supportedNetworks.join(', ')}
              onChange={(e) =>
                updateGlobal({
                  supportedNetworks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </FormField>
        </div>
        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <Button
            type="button"
            onClick={() => void saveFinancialLimits()}
            disabled={savingLimits || limitsLoading || !limitsHydrated}
          >
            {savingLimits ? 'Saving…' : 'Save deposit & withdrawal limits'}
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Security & KYC" />
        <p className="px-4 pt-4 text-caption text-fg-muted sm:px-5">
          KYC cannot be turned off for the platform. Admin Create user skips KYC for that
          investor only. Public registration, login, and Google signup still require KYC.
        </p>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {(
            [
              ['twoFaRequired', '2FA required'],
              ['maintenanceMode', 'Maintenance mode'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-caption text-fg-muted">
              <input
                type="checkbox"
                checked={g[key]}
                onChange={(e) => {
                  updateGlobal({ [key]: e.target.checked })
                  if (key === 'maintenanceMode') {
                    updateToggles({ maintenance: e.target.checked })
                    updateSiteSeo({ maintenanceMode: e.target.checked })
                  }
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Platform switches" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {(
            [
              ['registrationEnabled', 'Registration'],
              ['depositEnabled', 'Deposit'],
              ['withdrawalEnabled', 'Withdrawal'],
              ['referralEnabled', 'Referral'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-caption text-fg-muted">
              <input
                type="checkbox"
                checked={g[key]}
                onChange={(e) => {
                  updateGlobal({ [key]: e.target.checked })
                  if (key === 'registrationEnabled') updateToggles({ registration: e.target.checked })
                  if (key === 'depositEnabled') updateToggles({ deposit: e.target.checked })
                  if (key === 'withdrawalEnabled') updateToggles({ withdrawal: e.target.checked })
                  if (key === 'referralEnabled') updateToggles({ referral: e.target.checked })
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <Button
            type="button"
            onClick={() => void saveFinancialLimits()}
            disabled={savingLimits || limitsLoading || !limitsHydrated}
          >
            {savingLimits ? 'Saving…' : 'Save all'}
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Admin roles"
          description="Open Roles settings for the editable permission matrix."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Role</th>
                <th className="px-4 py-3 font-medium sm:px-5">Permissions enabled</th>
              </tr>
            </thead>
            <tbody>
              {state.roleMatrix.map((r) => (
                <tr key={r.roleKey} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 font-medium text-fg sm:px-5">{r.label}</td>
                  <td className="px-4 py-3 text-fg-muted sm:px-5">
                    {Object.entries(r.permissions)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
