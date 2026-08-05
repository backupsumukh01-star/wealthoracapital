'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  usePublishedLanding,
  usePublicAnnouncements,
  usePublicSettings,
} from '@/features/cms/site'
import { useCmsBootstrap } from '@/features/cms/hooks'

function pageScope(pathname: string): 'HOME' | 'DASHBOARD' | 'WALLET' | 'ALL' {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/wallet')) {
    if (pathname.startsWith('/wallet')) return 'WALLET'
    return 'DASHBOARD'
  }
  if (pathname === '/' || pathname === '') return 'HOME'
  return 'ALL'
}

/** Maintenance overlay + optional homepage popup from CMS. Site-wide announcement banners are disabled. */
export function CmsSiteOverlays() {
  const pathname = usePathname()
  const { landing, isSuccess: landingReady } = usePublishedLanding()
  const { data: boot } = useCmsBootstrap()
  const { data: publicSettings } = usePublicSettings()
  const { data: announcementsData, isSuccess: announcementsReady } = usePublicAnnouncements()
  const scope = pageScope(pathname)
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})
  const [popupOpen, setPopupOpen] = useState(false)

  const seo = (boot?.siteSeo ?? {}) as Record<string, unknown>
  const websiteName =
    (typeof seo.websiteName === 'string' && seo.websiteName) ||
    publicSettings?.companyName ||
    landing.companyName ||
    'Growzy'
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

  const popupAnn = useMemo(() => {
    if (!announcementsReady) return null
    const now = Date.now()
    return (
      (announcementsData?.items ?? []).find(
        (a) =>
          a.status === 'PUBLISHED' &&
          a.popup &&
          (!a.expiresAt || new Date(a.expiresAt).getTime() > now) &&
          (a.displayPage === 'ALL' || a.displayPage === scope || !a.displayPage) &&
          !dismissed[a.id],
      ) ?? null
    )
  }, [announcementsReady, announcementsData?.items, scope, dismissed])

  useEffect(() => {
    if (!landingReady) return
    if (scope === 'HOME' && landing.homepagePopup.enabled) {
      const key = 'growzy_home_popup_dismissed'
      if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
        setPopupOpen(true)
      }
    }
  }, [landingReady, scope, landing.homepagePopup.enabled])

  useEffect(() => {
    if (popupAnn) setPopupOpen(true)
  }, [popupAnn?.id])

  if (!landingReady && !boot) return null

  return (
    <>
      {maintenanceMode ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-base/95 p-6 backdrop-blur-md"
          role="alertdialog"
          aria-label="Maintenance mode"
        >
          <div className="max-w-lg rounded-2xl border border-white/10 bg-raised/90 p-8 text-center shadow-glow-soft">
            <p className="text-caption uppercase tracking-wider text-amber-300">Maintenance</p>
            <h2 className="mt-2 text-heading-md text-fg">{websiteName}</h2>
            <p className="mt-3 text-body-md text-fg-muted">
              {maintenanceMessage || 'We are performing scheduled maintenance. Please check back shortly.'}
            </p>
            <p className="mt-4 text-caption text-fg-subtle">
              Support · {supportEmail}
              {supportHours ? ` · ${supportHours}` : ''}
            </p>
          </div>
        </div>
      ) : null}

      <Dialog
        open={popupOpen && !maintenanceMode}
        onOpenChange={(o) => {
          setPopupOpen(o)
          if (!o && typeof window !== 'undefined') {
            sessionStorage.setItem('growzy_home_popup_dismissed', '1')
            if (popupAnn) setDismissed((d) => ({ ...d, [popupAnn.id]: true }))
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {popupAnn?.title || landing.homepagePopup.title || 'Announcement'}
            </DialogTitle>
            <DialogDescription>
              {popupAnn?.body || landing.homepagePopup.body}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setPopupOpen(false)
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('growzy_home_popup_dismissed', '1')
                }
                if (popupAnn) setDismissed((d) => ({ ...d, [popupAnn.id]: true }))
              }}
            >
              {landing.homepagePopup.cta || 'Got it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
