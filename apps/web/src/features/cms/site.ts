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
import type { PlatformSettings, PublicSettings } from '@/types/domain'
import type { CmsPublicAnnouncement, CmsPublicPage } from '@/services/cms.service'

export function usePublishedLanding(options?: QueryHookOptions) {
  const q = useCmsBootstrap(options)
  const defaults = useMemo(() => createDefaultAdminOs().landing, [])
  const landing: LandingCms = useMemo(
    () => (q.data ? mapLandingCms(q.data.landing, defaults) : defaults),
    [q.data, defaults],
  )
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
