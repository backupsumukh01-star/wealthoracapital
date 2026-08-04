'use client'

import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminGlobalSettingsWorkspace() {
  const { state, updateGlobal, updateToggles, updateSiteSeo } = useAdminOs()
  const g = state.global
  const seo = state.siteSeo

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
        <AdminPanelHeader title="Financial limits" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
          {(
            [
              ['minDeposit', 'Min deposit'],
              ['maxDeposit', 'Max deposit'],
              ['minWithdrawal', 'Min withdrawal'],
              ['maxWithdrawal', 'Max withdrawal'],
              ['dailyWithdrawalLimit', 'Daily withdrawal limit'],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label}>
              <Input value={g[key]} onChange={(e) => updateGlobal({ [key]: e.target.value })} />
            </FormField>
          ))}
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
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Security & KYC" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {(
            [
              ['kycRequired', 'KYC required'],
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
                  if (key === 'kycRequired') updateToggles({ kyc: e.target.checked })
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
          <Button type="button" onClick={() => toast.success('Global settings saved')}>
            Save all
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
