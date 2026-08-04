'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ExternalLink, Eye, Save, Send } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminLandingCmsWorkspace() {
  const { previewLanding, updateLandingDraft, saveLandingDraft, publishLanding, state } =
    useAdminOs()
  const [previewMode, setPreviewMode] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const d = previewLanding

  function patch<K extends keyof typeof d>(key: K, value: (typeof d)[K]) {
    updateLandingDraft({ [key]: value } as Partial<typeof d>)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Landing Page CMS"
        description="Edit homepage content without code. Save draft, preview, then publish live."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => {
                saveLandingDraft()
                toast.success('Draft saved — revision recorded')
              }}
            >
              <Save aria-hidden />
              Save draft
            </Button>
            <Button type="button" variant="glass" size="sm" onClick={() => setPreviewMode((v) => !v)}>
              <Eye aria-hidden />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.marketing.home} target="_blank">
                <ExternalLink aria-hidden />
                Live site
              </Link>
            </Button>
            <Button type="button" size="sm" onClick={() => setConfirmPublish(true)}>
              <Send aria-hidden />
              Publish
            </Button>
          </div>
        }
      />

      {state.revisions.filter((r) => r.module === 'landing').length > 0 ? (
        <AdminPanel>
          <AdminPanelHeader
            title="Save history"
            description="Recent landing drafts & publishes"
          />
          <ul className="divide-y divide-white/[0.04]">
            {state.revisions
              .filter((r) => r.module === 'landing')
              .slice(0, 6)
              .map((r) => (
                <li key={r.id} className="flex justify-between gap-3 px-4 py-2.5 text-caption sm:px-5">
                  <span className="text-fg">{r.label}</span>
                  <span className="tabular-nums text-fg-subtle">
                    {r.admin} · {r.at.slice(0, 16).replace('T', ' ')}
                  </span>
                </li>
              ))}
          </ul>
        </AdminPanel>
      ) : null}

      {previewMode ? (
        <AdminPanel glow>
          <AdminPanelHeader title="Draft preview" description={`Status · ${d.status}`} />
          <div className="space-y-4 p-5 sm:p-6">
            <p className="text-caption uppercase tracking-wider text-accent-300">{d.companyName}</p>
            <h2 className="text-display-sm text-fg">{d.heroTitle}</h2>
            <p className="text-body-md text-fg-muted">{d.heroSubtitle}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">{d.heroPrimaryCta}</Button>
              <Button size="sm" variant="glass">
                {d.heroSecondaryCta}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Avg monthly', `${d.avgMonthlyReturn}%`],
                ['Win rate', `${d.winRate}%`],
                ['AUM', `$${d.aum}M`],
                ['Best day', `${d.bestDay}%`],
                ['Investors', d.investorCount],
                ['Countries', d.countries],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/8 bg-inset/40 p-3">
                  <p className="text-caption text-fg-subtle">{k}</p>
                  <p className="mt-1 text-heading-sm text-fg">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-caption text-fg-subtle">{d.riskDisclosure}</p>
          </div>
        </AdminPanel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <AdminPanel>
            <AdminPanelHeader title="Brand & hero" />
            <div className="grid gap-4 p-4 sm:p-5">
              <FormField label="Company name">
                <Input value={d.companyName} onChange={(e) => patch('companyName', e.target.value)} />
              </FormField>
              <FormField label="Logo URL">
                <Input value={d.logoUrl} onChange={(e) => patch('logoUrl', e.target.value)} />
              </FormField>
              <FormField label="Hero title">
                <Input value={d.heroTitle} onChange={(e) => patch('heroTitle', e.target.value)} />
              </FormField>
              <FormField label="Hero subtitle">
                <Textarea
                  value={d.heroSubtitle}
                  onChange={(e) => patch('heroSubtitle', e.target.value)}
                  rows={3}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Primary button">
                  <Input
                    value={d.heroPrimaryCta}
                    onChange={(e) => patch('heroPrimaryCta', e.target.value)}
                  />
                </FormField>
                <FormField label="Secondary button">
                  <Input
                    value={d.heroSecondaryCta}
                    onChange={(e) => patch('heroSecondaryCta', e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Hero banner URL">
                <Input
                  value={d.heroBannerUrl}
                  onChange={(e) => patch('heroBannerUrl', e.target.value)}
                  placeholder="Optional image URL"
                />
              </FormField>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader
              title="Background animation"
              description="Particles, glow, and intensity on the hero."
            />
            <div className="grid gap-4 p-4 sm:p-5">
              <label className="flex items-center gap-2 text-caption text-fg-muted">
                <input
                  type="checkbox"
                  checked={d.heroMotion.particlesEnabled}
                  onChange={(e) =>
                    patch('heroMotion', {
                      ...d.heroMotion,
                      particlesEnabled: e.target.checked,
                    })
                  }
                />
                Enable floating particles
              </label>
              <label className="flex items-center gap-2 text-caption text-fg-muted">
                <input
                  type="checkbox"
                  checked={d.heroMotion.glowEnabled}
                  onChange={(e) =>
                    patch('heroMotion', { ...d.heroMotion, glowEnabled: e.target.checked })
                  }
                />
                Enable ambient glow
              </label>
              <FormField label={`Intensity · ${d.heroMotion.intensity}`}>
                <input
                  type="range"
                  min={0.2}
                  max={1.5}
                  step={0.05}
                  value={d.heroMotion.intensity}
                  onChange={(e) =>
                    patch('heroMotion', {
                      ...d.heroMotion,
                      intensity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-accent-400"
                />
              </FormField>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Performance numbers" description="Shown on homepage proof sections." />
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {(
                [
                  ['avgMonthlyReturn', 'Avg monthly return %'],
                  ['winRate', 'Win rate %'],
                  ['aum', 'AUM ($M)'],
                  ['bestDay', 'Best day %'],
                  ['investorCount', 'Investor count'],
                  ['countries', 'Countries'],
                ] as const
              ).map(([key, label]) => (
                <FormField key={key} label={label}>
                  <Input value={d[key]} onChange={(e) => patch(key, e.target.value)} />
                </FormField>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Contact & social" />
            <div className="grid gap-4 p-4 sm:p-5">
              <FormField label="Support email">
                <Input value={d.supportEmail} onChange={(e) => patch('supportEmail', e.target.value)} />
              </FormField>
              <FormField label="WhatsApp">
                <Input value={d.whatsapp} onChange={(e) => patch('whatsapp', e.target.value)} />
              </FormField>
              <FormField label="Telegram">
                <Input value={d.telegram} onChange={(e) => patch('telegram', e.target.value)} />
              </FormField>
              {(
                [
                  ['twitter', 'Twitter'],
                  ['linkedin', 'LinkedIn'],
                  ['facebook', 'Facebook'],
                  ['instagram', 'Instagram'],
                  ['discord', 'Discord'],
                ] as const
              ).map(([key, label]) => (
                <FormField key={key} label={label}>
                  <Input
                    value={d.social[key]}
                    onChange={(e) =>
                      patch('social', { ...d.social, [key]: e.target.value })
                    }
                  />
                </FormField>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Footer, risk & popup" />
            <div className="grid gap-4 p-4 sm:p-5">
              <FormField label="Footer tagline">
                <Input value={d.footerTagline} onChange={(e) => patch('footerTagline', e.target.value)} />
              </FormField>
              <FormField label="Risk disclosure">
                <Textarea
                  value={d.riskDisclosure}
                  onChange={(e) => patch('riskDisclosure', e.target.value)}
                  rows={4}
                />
              </FormField>
              <FormField label="Announcements banner text">
                <Input
                  value={d.announcementsBanner}
                  onChange={(e) => patch('announcementsBanner', e.target.value)}
                />
              </FormField>
              <FormField label="Homepage popup title">
                <Input
                  value={d.homepagePopup.title}
                  onChange={(e) =>
                    patch('homepagePopup', { ...d.homepagePopup, title: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Homepage popup body">
                <Textarea
                  value={d.homepagePopup.body}
                  onChange={(e) =>
                    patch('homepagePopup', { ...d.homepagePopup, body: e.target.value })
                  }
                  rows={3}
                />
              </FormField>
              <FormField label="Homepage popup CTA">
                <Input
                  value={d.homepagePopup.cta}
                  onChange={(e) =>
                    patch('homepagePopup', { ...d.homepagePopup, cta: e.target.value })
                  }
                />
              </FormField>
              <label className="flex items-center gap-2 text-caption text-fg-muted">
                <input
                  type="checkbox"
                  checked={d.homepagePopup.enabled}
                  onChange={(e) =>
                    patch('homepagePopup', { ...d.homepagePopup, enabled: e.target.checked })
                  }
                />
                Enable homepage popup
              </label>
            </div>
          </AdminPanel>
        </div>
      )}

      <ConfirmActionDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish landing page?"
        description="Draft content will go live on the public homepage immediately. A revision snapshot will be saved."
        confirmLabel="Publish live"
        onConfirm={() => {
          publishLanding()
          toast.success('Landing page published')
        }}
      />
    </div>
  )
}
