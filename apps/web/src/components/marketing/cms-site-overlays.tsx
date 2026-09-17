'use client'

import {
  usePublishedLanding,
  usePublicSettings,
} from '@/features/cms/site'
import { useCmsBootstrap } from '@/features/cms/hooks'

/** Production maintenance overlay. Marketing popups and announcement banners are disabled. */
export function CmsSiteOverlays() {
  const { landing } = usePublishedLanding()
  const { data: boot } = useCmsBootstrap()
  const { data: publicSettings } = usePublicSettings()

  const seo = (boot?.siteSeo ?? {}) as Record<string, unknown>
  const websiteName =
    (typeof seo.websiteName === 'string' && seo.websiteName) ||
    publicSettings?.companyName ||
    landing.companyName ||
    'Wealthora'
  const supportEmail =
    (typeof seo.supportEmail === 'string' && seo.supportEmail) ||
    publicSettings?.supportEmail ||
    landing.supportEmail
  const supportHours = typeof seo.supportHours === 'string' ? seo.supportHours : ''
  const maintenanceMessage =
    typeof seo.maintenanceMessage === 'string' ? seo.maintenanceMessage : ''
  const maintenanceMode =
    publicSettings?.maintenanceMode === true ||
    boot?.featureFlags?.maintenance === true ||
    seo.maintenanceMode === true

  if (!maintenanceMode) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-base/95 p-6 backdrop-blur-md"
      role="alertdialog"
      aria-label="Maintenance mode"
    >
      <div className="max-w-lg rounded-2xl border border-white/10 bg-raised/90 p-8 text-center shadow-glow-soft">
        <p className="text-caption uppercase tracking-wider text-amber-300">Maintenance</p>
        <h2 className="mt-2 text-heading-md text-fg">{websiteName}</h2>
        <p className="mt-3 text-body-md text-fg-muted">
          {maintenanceMessage ||
            'We are performing scheduled maintenance. Please check back shortly.'}
        </p>
        <p className="mt-4 text-caption text-fg-subtle">
          Support · {supportEmail}
          {supportHours ? ` · ${supportHours}` : ''}
        </p>
      </div>
    </div>
  )
}
