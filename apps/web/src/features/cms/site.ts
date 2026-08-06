'use client'

/**
 * Production CMS / site bootstrap for marketing + investor copy.
 * Prefer this over Admin OS / mocks.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useCmsBootstrap, cmsQueryKeys } from './hooks'
import { cmsApi } from './api'
import { settingsService } from '@/services/settings.service'
import { mapLandingCms, mapPlatformCms } from '@/lib/cms-bootstrap-map'
import { createDefaultAdminOs } from '@/lib/admin-os-store'
import type { LandingCms } from '@/lib/admin-os-store'
import type { PlatformCms } from '@/lib/admin-cms-extras'
import type { QueryHookOptions } from '@/lib/query-client'
import type { FrontendCmsDocument, PlatformSettings, PublicSettings } from '@/types/domain'
import type { CmsPublicAnnouncement, CmsPublicPage } from '@/services/cms.service'

function mergeLandingWithFrontend(landing: LandingCms, frontend: FrontendCmsDocument | null | undefined): LandingCms {
  if (!frontend) return landing
  const hero = frontend.sections?.find((s) => s.key === 'hero')
  const footer = frontend.sections?.find((s) => s.key === 'footer')
  const performance = frontend.sections?.find((s) => s.key === 'performance')
  const heroMeta = (hero?.meta ?? {}) as Record<string, unknown>
  const pickPerf = (needle: string) =>
    performance?.items?.find((i) => String(i.label ?? '').toLowerCase().includes(needle))?.value

  return {
    ...landing,
    companyName: String(heroMeta.companyName ?? landing.companyName),
    logoUrl: hero?.logoUrl || landing.logoUrl,
    heroTitle: hero?.title || landing.heroTitle,
    heroSubtitle: hero?.description || landing.heroSubtitle,
    heroPrimaryCta: hero?.primaryCta || landing.heroPrimaryCta,
    heroSecondaryCta: hero?.secondaryCta || landing.heroSecondaryCta,
    heroBannerUrl: hero?.imageUrl || hero?.backgroundUrl || landing.heroBannerUrl,
    avgMonthlyReturn: String(pickPerf('monthly') ?? landing.avgMonthlyReturn),
    winRate: String(pickPerf('win') ?? landing.winRate),
    aum: String(pickPerf('aum') ?? landing.aum),
    bestDay: String(pickPerf('best') ?? landing.bestDay),
    footerTagline: footer?.description || landing.footerTagline,
    supportEmail: frontend.contact?.supportEmail || landing.supportEmail,
    whatsapp: frontend.social?.whatsapp || landing.whatsapp,
    telegram: frontend.social?.telegram || landing.telegram,
    social: {
      ...landing.social,
      twitter: frontend.social?.twitter || landing.social.twitter,
      linkedin: frontend.social?.linkedin || landing.social.linkedin,
      facebook: frontend.social?.facebook || landing.social.facebook,
      instagram: frontend.social?.instagram || landing.social.instagram,
      discord: frontend.social?.discord || landing.social.discord,
    },
    heroMotion: {
      ...landing.heroMotion,
      particlesEnabled:
        heroMeta.particlesEnabled !== undefined
          ? Boolean(heroMeta.particlesEnabled)
          : landing.heroMotion.particlesEnabled,
      glowEnabled:
        heroMeta.glowEnabled !== undefined
          ? Boolean(heroMeta.glowEnabled)
          : landing.heroMotion.glowEnabled,
      intensity:
        typeof heroMeta.intensity === 'number' ? heroMeta.intensity : landing.heroMotion.intensity,
    },
  }
}

export function usePublishedLanding(options?: QueryHookOptions) {
  const q = useCmsBootstrap(options)
  const defaults = useMemo(() => createDefaultAdminOs().landing, [])
  const landing: LandingCms = useMemo(() => {
    const base = q.data ? mapLandingCms(q.data.landing, defaults) : defaults
    return mergeLandingWithFrontend(base, q.data?.frontend as FrontendCmsDocument | undefined)
  }, [q.data, defaults])
  return { ...q, landing }
}

export function usePublishedPlatform(options?: QueryHookOptions) {
  const q = useCmsBootstrap(options)
  const defaults = useMemo(() => createDefaultAdminOs().platformCms, [])
  const platform: PlatformCms = useMemo(
    () => (q.data ? mapPlatformCms(q.data.platform, defaults) : defaults),
    [q.data, defaults],
  )
  return { ...q, platform }
}

export function usePublishedFaqs(options?: QueryHookOptions) {
  const q = useCmsBootstrap(options)
  return {
    ...q,
    faqs: q.data?.faqs ?? [],
  }
}

export function usePublishedTestimonials(options?: QueryHookOptions) {
  const q = useCmsBootstrap(options)
  return {
    ...q,
    testimonials: Array.isArray(q.data?.testimonials) ? q.data!.testimonials : [],
  }
}

/** Published site announcements (popups / banners) from the public CMS API. */
export function usePublicAnnouncements(options?: QueryHookOptions) {
  return useQuery<{ items: CmsPublicAnnouncement[] }>({
    queryKey: [...cmsQueryKeys.all, 'announcements'],
    queryFn: () => cmsApi.publicAnnouncements(),
    enabled: options?.enabled,
    staleTime: 60_000,
  })
}

/** Published CMS page body by slug (`/cms/public/pages/:slug`). */
export function usePublicCmsPage(slug: string, options?: QueryHookOptions) {
  return useQuery<CmsPublicPage>({
    queryKey: [...cmsQueryKeys.all, 'page', slug],
    queryFn: () => cmsApi.publicPage(slug),
    enabled: (options?.enabled ?? true) && Boolean(slug),
    staleTime: 60_000,
    retry: false,
  })
}

export function usePublicSettings(options?: QueryHookOptions) {
  return useQuery<PublicSettings>({
    queryKey: [...cmsQueryKeys.all, 'public-settings'],
    queryFn: () => settingsService.public(),
    enabled: options?.enabled,
    staleTime: 60_000,
  })
}

export function useAdminPlatformSettings(options?: QueryHookOptions) {
  return useQuery<PlatformSettings>({
    queryKey: [...cmsQueryKeys.all, 'admin-settings'],
    queryFn: () => settingsService.adminGet(),
    enabled: options?.enabled,
    staleTime: 30_000,
  })
}

export function useAdminFeatureFlags(options?: QueryHookOptions) {
  return useQuery<Record<string, boolean>>({
    queryKey: [...cmsQueryKeys.all, 'feature-flags'],
    queryFn: () => settingsService.featureFlags(),
    enabled: options?.enabled,
  })
}

/** Admin landing draft from CMS API (not localStorage). */
export function useAdminLandingDraft(options?: QueryHookOptions) {
  return useQuery({
    queryKey: [...cmsQueryKeys.all, 'admin-landing'],
    queryFn: () => cmsApi.getLanding(),
    enabled: options?.enabled,
  })
}

export function useAdminPlatformCms(options?: QueryHookOptions) {
  return useQuery({
    queryKey: [...cmsQueryKeys.all, 'admin-platform'],
    queryFn: () => cmsApi.getPlatform(),
    enabled: options?.enabled,
  })
}
