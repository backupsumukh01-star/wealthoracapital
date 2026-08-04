'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAdminOs } from '@/providers/admin-os-provider'

function pageScope(pathname: string): 'HOME' | 'DASHBOARD' | 'WALLET' | 'ALL' {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/wallet')) {
    if (pathname.startsWith('/wallet')) return 'WALLET'
    return 'DASHBOARD'
  }
  if (pathname === '/' || pathname === '') return 'HOME'
  return 'ALL'
}

/** Maintenance overlay + announcement banners + homepage popup from CMS. */
export function CmsSiteOverlays() {
  const pathname = usePathname()
  const { ready, state, publishedLanding } = useAdminOs()
  const seo = state.siteSeo
  const scope = pageScope(pathname)
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})
  const [popupOpen, setPopupOpen] = useState(false)

  const banners = useMemo(() => {
    if (!ready) return []
    const now = Date.now()
    return state.announcements
      .filter((a) => a.status === 'PUBLISHED')
      .filter((a) => !a.expiresAt || new Date(a.expiresAt).getTime() > now)
      .filter((a) => a.displayPage === 'ALL' || a.displayPage === scope)
      .filter((a) => !a.popup)
      .filter((a) => !dismissed[a.id])
      .sort((a, b) => {
        const rank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
        return rank[a.priority] - rank[b.priority]
      })
  }, [ready, state.announcements, scope, dismissed])

  const popupAnn = useMemo(() => {
    if (!ready) return null
    const now = Date.now()
    return (
      state.announcements.find(
        (a) =>
          a.status === 'PUBLISHED' &&
          a.popup &&
          (!a.expiresAt || new Date(a.expiresAt).getTime() > now) &&
          (a.displayPage === 'ALL' || a.displayPage === scope) &&
          !dismissed[a.id],
      ) ?? null
    )
  }, [ready, state.announcements, scope, dismissed])

  useEffect(() => {
    if (!ready) return
    if (scope === 'HOME' && publishedLanding.homepagePopup.enabled) {
      const key = 'growzy_home_popup_dismissed'
      if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
        setPopupOpen(true)
      }
    }
  }, [ready, scope, publishedLanding.homepagePopup.enabled])

  useEffect(() => {
    if (popupAnn) setPopupOpen(true)
  }, [popupAnn?.id])

  if (!ready) return null

  return (
    <>
      {seo.maintenanceMode ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-base/95 p-6 backdrop-blur-md"
          role="alertdialog"
          aria-label="Maintenance mode"
        >
          <div className="max-w-lg rounded-2xl border border-white/10 bg-raised/90 p-8 text-center shadow-glow-soft">
            <p className="text-caption uppercase tracking-wider text-amber-300">Maintenance</p>
            <h2 className="mt-2 text-heading-md text-fg">{seo.websiteName || 'Growzy'}</h2>
            <p className="mt-3 text-body-md text-fg-muted">
              {seo.maintenanceMessage || 'We are performing scheduled maintenance. Please check back shortly.'}
            </p>
            <p className="mt-4 text-caption text-fg-subtle">
              Support · {seo.supportEmail || publishedLanding.supportEmail} · {seo.supportHours}
            </p>
          </div>
        </div>
      ) : null}

      {publishedLanding.announcementsBanner ? (
        <div className="relative z-[60] border-b border-white/10 bg-accent-500/15 px-4 py-2 text-center text-caption text-fg">
          {publishedLanding.announcementsBanner}
        </div>
      ) : null}

      {banners.map((a) => (
        <div
          key={a.id}
          className={a.sticky ? 'sticky top-[var(--nav-offset,0)] z-[55]' : 'relative z-[55]'}
          style={{ background: `${a.color}22`, borderBottom: `1px solid ${a.color}55` }}
        >
          <div className="container-page flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0 text-left">
              <p className="text-body-sm font-medium text-fg">{a.title}</p>
              <p className="text-caption text-fg-muted">{a.body}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-fg-muted hover:bg-white/5 hover:text-fg"
              aria-label="Dismiss"
              onClick={() => setDismissed((d) => ({ ...d, [a.id]: true }))}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}

      <Dialog
        open={popupOpen && !seo.maintenanceMode}
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
              {popupAnn?.title || publishedLanding.homepagePopup.title || 'Announcement'}
            </DialogTitle>
            <DialogDescription>
              {popupAnn?.body || publishedLanding.homepagePopup.body}
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
              {publishedLanding.homepagePopup.cta || 'Got it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
