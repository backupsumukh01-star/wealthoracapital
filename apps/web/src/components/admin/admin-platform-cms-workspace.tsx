'use client'

import { useState } from 'react'
import { Eye, History, Save, Send } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAdminOs } from '@/providers/admin-os-provider'

/** CMS for dashboard, wallet, trades, nav labels, risk — draft / preview / publish / rollback. */
export function AdminPlatformCmsWorkspace() {
  const {
    state,
    updatePlatformCmsDraft,
    publishPlatformCms,
    rollbackRevision,
  } = useAdminOs()
  const d = state.platformCmsDraft
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)

  function patchDashboard<K extends keyof typeof d.dashboard>(key: K, value: (typeof d.dashboard)[K]) {
    updatePlatformCmsDraft({ dashboard: { ...d.dashboard, [key]: value } })
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Platform CMS"
        description="Edit investor dashboard, wallet, trades, navigation labels, support and risk copy. Draft → preview → publish. Rollback from version history."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="glass"
              onClick={() => {
                updatePlatformCmsDraft({})
                toast.success('Draft kept · use Publish to go live')
              }}
            >
              <Save aria-hidden />
              Save draft
            </Button>
            <Button type="button" size="sm" variant="glass" onClick={() => setPreview((v) => !v)}>
              <Eye aria-hidden />
              {preview ? 'Edit' : 'Preview'}
            </Button>
            <Button type="button" size="sm" onClick={() => setConfirm(true)}>
              <Send aria-hidden />
              Publish
            </Button>
          </div>
        }
      />

      {preview ? (
        <AdminPanel glow>
          <AdminPanelHeader title="Draft preview" description={d.status} />
          <div className="space-y-4 p-5">
            <h2 className="text-heading-md text-fg">{d.dashboard.welcomeTitle}</h2>
            <p className="text-fg-muted">{d.dashboard.welcomeSubtitle}</p>
            <p className="text-caption text-fg-subtle">{d.wallet.helperText}</p>
            <p className="text-caption text-fg-subtle">{d.riskDisclaimer}</p>
          </div>
        </AdminPanel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <AdminPanel>
            <AdminPanelHeader title="Dashboard copy" />
            <div className="grid gap-3 p-4 sm:p-5">
              {(
                [
                  ['welcomeTitle', 'Welcome title'],
                  ['welcomeSubtitle', 'Welcome subtitle'],
                  ['portfolioEyebrow', 'Portfolio eyebrow'],
                  ['emptyStateHint', 'Empty state hint'],
                ] as const
              ).map(([key, label]) => (
                <FormField key={key} label={label}>
                  <Input
                    value={d.dashboard[key]}
                    onChange={(e) => patchDashboard(key, e.target.value)}
                  />
                </FormField>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Wallet copy" />
            <div className="grid gap-3 p-4 sm:p-5">
              {(
                [
                  ['title', 'Title'],
                  ['depositCta', 'Deposit CTA'],
                  ['withdrawCta', 'Withdraw CTA'],
                  ['helperText', 'Helper text'],
                ] as const
              ).map(([key, label]) => (
                <FormField key={key} label={label}>
                  <Input
                    value={d.wallet[key]}
                    onChange={(e) =>
                      updatePlatformCmsDraft({ wallet: { ...d.wallet, [key]: e.target.value } })
                    }
                  />
                </FormField>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Trades & performance" />
            <div className="grid gap-3 p-4 sm:p-5">
              <FormField label="Trades title">
                <Input
                  value={d.trades.title}
                  onChange={(e) =>
                    updatePlatformCmsDraft({ trades: { ...d.trades, title: e.target.value } })
                  }
                />
              </FormField>
              <FormField label="Trades empty hint">
                <Input
                  value={d.trades.emptyHint}
                  onChange={(e) =>
                    updatePlatformCmsDraft({ trades: { ...d.trades, emptyHint: e.target.value } })
                  }
                />
              </FormField>
              <FormField label="Performance title">
                <Input
                  value={d.performance.title}
                  onChange={(e) =>
                    updatePlatformCmsDraft({
                      performance: { ...d.performance, title: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="Performance disclaimer">
                <Textarea
                  value={d.performance.disclaimer}
                  onChange={(e) =>
                    updatePlatformCmsDraft({
                      performance: { ...d.performance, disclaimer: e.target.value },
                    })
                  }
                  rows={2}
                />
              </FormField>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Support, risk & contact" />
            <div className="grid gap-3 p-4 sm:p-5">
              <FormField label="Support headline">
                <Input
                  value={d.supportBlock.headline}
                  onChange={(e) =>
                    updatePlatformCmsDraft({
                      supportBlock: { ...d.supportBlock, headline: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="Support body">
                <Textarea
                  value={d.supportBlock.body}
                  onChange={(e) =>
                    updatePlatformCmsDraft({
                      supportBlock: { ...d.supportBlock, body: e.target.value },
                    })
                  }
                  rows={2}
                />
              </FormField>
              <FormField label="Risk disclaimer">
                <Textarea
                  value={d.riskDisclaimer}
                  onChange={(e) => updatePlatformCmsDraft({ riskDisclaimer: e.target.value })}
                  rows={3}
                />
              </FormField>
              <FormField label="Contact blurb">
                <Textarea
                  value={d.contactBlurb}
                  onChange={(e) => updatePlatformCmsDraft({ contactBlurb: e.target.value })}
                  rows={2}
                />
              </FormField>
            </div>
          </AdminPanel>

          <AdminPanel className="xl:col-span-2">
            <AdminPanelHeader title="Marketing navigation labels" />
            <ul className="divide-y divide-white/[0.04]">
              {d.marketingNav.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <Input
                    className="max-w-[12rem]"
                    value={item.label}
                    onChange={(e) => {
                      const marketingNav = d.marketingNav.map((n, i) =>
                        i === idx ? { ...n, label: e.target.value } : n,
                      )
                      updatePlatformCmsDraft({ marketingNav })
                    }}
                  />
                  <span className="text-caption text-fg-subtle">{item.href}</span>
                  <label className="ml-auto flex items-center gap-2 text-caption text-fg-muted">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => {
                        const marketingNav = d.marketingNav.map((n, i) =>
                          i === idx ? { ...n, enabled: e.target.checked } : n,
                        )
                        updatePlatformCmsDraft({ marketingNav })
                      }}
                    />
                    Visible
                  </label>
                </li>
              ))}
            </ul>
          </AdminPanel>
        </div>
      )}

      <AdminPanel>
        <AdminPanelHeader
          title="Version history"
          description="Author · timestamp · publish date · rollback"
        />
        <ul className="divide-y divide-white/[0.04]">
          {state.revisions
            .filter((r) => r.module === 'platform' || r.module === 'landing')
            .slice(0, 12)
            .map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div>
                  <p className="text-fg">
                    <History className="mr-1 inline size-3.5 text-fg-subtle" aria-hidden />
                    {r.label}
                  </p>
                  <p className="text-caption text-fg-subtle">
                    {r.admin} · {r.at.slice(0, 19).replace('T', ' ')}
                    {r.publishDate ? ` · published ${r.publishDate.slice(0, 10)}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    const ok = rollbackRevision(r.id)
                    toast[ok ? 'success' : 'error'](ok ? 'Rolled back to draft' : 'Rollback failed')
                  }}
                >
                  Rollback
                </Button>
              </li>
            ))}
        </ul>
      </AdminPanel>

      <ConfirmActionDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Publish platform CMS?"
        description="Dashboard, wallet, nav labels and risk copy go live for investors."
        confirmLabel="Publish"
        onConfirm={() => {
          publishPlatformCms()
          toast.success('Platform CMS published')
        }}
      />
    </div>
  )
}
