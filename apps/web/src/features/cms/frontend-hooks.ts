'use client'

/**
 * Frontend CMS + downloads hooks.
 * Public bootstrap remains the single marketing hydrate path; these hooks cover admin CRUD.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cmsApi } from './api'
import { cmsQueryKeys, useCmsBootstrap } from './hooks'
import {
  cmsDownloadService,
  type CmsDownloadListQuery,
  type CmsDownloadMeta,
} from '@/services/cms-download.service'
import type { CmsDocumentEnvelope } from '@/services/cms.service'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { QueryHookOptions } from '@/lib/query-client'
import type { FrontendCmsDocument } from '@/types/domain'

export const frontendCmsQueryKeys = {
  all: ['cms', 'frontend'] as const,
  document: () => [...frontendCmsQueryKeys.all, 'document'] as const,
  revisions: () => [...frontendCmsQueryKeys.all, 'revisions'] as const,
}

export const downloadsQueryKeys = {
  all: ['cms', 'downloads'] as const,
  list: (query?: CmsDownloadListQuery) => [...downloadsQueryKeys.all, 'list', query ?? {}] as const,
  public: () => [...downloadsQueryKeys.all, 'public'] as const,
  detail: (id: string) => [...downloadsQueryKeys.all, 'detail', id] as const,
}

function asFrontendDoc(envelope: CmsDocumentEnvelope): FrontendCmsDocument & { version: number } {
  const content = (envelope.content ?? {}) as Partial<FrontendCmsDocument>
  return {
    status: (envelope.status as FrontendCmsDocument['status']) || content.status || 'DRAFT',
    updatedAt: envelope.updatedAt || content.updatedAt || new Date().toISOString(),
    publishedAt: envelope.publishedAt ?? content.publishedAt ?? null,
    version: envelope.version,
    sections: Array.isArray(content.sections) ? content.sections : [],
    seo: content.seo ?? {
      metaTitle: '',
      metaDescription: '',
      ogImageUrl: '',
      faviconUrl: '',
    },
    social: content.social ?? {
      twitter: '',
      linkedin: '',
      facebook: '',
      instagram: '',
      discord: '',
      telegram: '',
      whatsapp: '',
    },
    contact: content.contact ?? {
      supportEmail: '',
      supportPhone: '',
      address: '',
      hours: '',
    },
  }
}

/** Published frontend CMS from public bootstrap — used to hide/show landing sections. */
export function usePublishedFrontend(options?: QueryHookOptions) {
  const query = useCmsBootstrap(options)
  const frontend = (query.data?.frontend ?? null) as FrontendCmsDocument | null
  // Public landing always uses Demo Mode IA — CMS may supply copy/items inside
  // sections, but must not hide the premium composition via visible:false.
  function isSectionVisible(_key: string, fallback = true): boolean {
    return fallback
  }

  function getSection(key: string) {
    return frontend?.sections?.find((s) => s.key === key) ?? null
  }

  return {
    ...query,
    frontend,
    downloads: query.data?.downloads ?? [],
    isSectionVisible,
    getSection,
  }
}

export function useFrontendCmsDocument(options?: QueryHookOptions) {
  return useQuery({
    queryKey: frontendCmsQueryKeys.document(),
    queryFn: async () => asFrontendDoc(await cmsApi.getFrontend()),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.normal,
  })
}

export function useFrontendCmsRevisions(options?: QueryHookOptions) {
  return useQuery({
    queryKey: frontendCmsQueryKeys.revisions(),
    queryFn: async () => {
      const res = await cmsApi.frontendRevisions()
      return res.items
    },
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.slow,
  })
}

export function useSaveFrontendDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FrontendCmsDocument | Record<string, unknown>) =>
      cmsApi.updateFrontendDraft(body as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: frontendCmsQueryKeys.all })
    },
  })
}

export function usePublishFrontend() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content?: FrontendCmsDocument | Record<string, unknown>) =>
      cmsApi.publishFrontend(content as Record<string, unknown> | undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: frontendCmsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: cmsQueryKeys.bootstrap() })
    },
  })
}

export function useCmsDownloads(query?: CmsDownloadListQuery, options?: QueryHookOptions) {
  return useQuery({
    queryKey: downloadsQueryKeys.list(query),
    queryFn: () => cmsDownloadService.list(query),
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.normal,
  })
}

export function usePublishedDownloads(options?: QueryHookOptions) {
  return useQuery({
    queryKey: downloadsQueryKeys.public(),
    queryFn: async () => {
      const res = await cmsDownloadService.publicList()
      return res.items
    },
    enabled: options?.enabled,
    staleTime: QUERY_STALE_TIME.slow,
  })
}

export function useCreateCmsDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: CmsDownloadMeta }) =>
      cmsDownloadService.create(file, meta),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadsQueryKeys.all })
    },
  })
}

export function useUpdateCmsDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CmsDownloadMeta }) =>
      cmsDownloadService.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadsQueryKeys.all })
    },
  })
}

export function useReplaceCmsDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file, version }: { id: string; file: File; version?: string }) =>
      cmsDownloadService.replace(id, file, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadsQueryKeys.all })
    },
  })
}

export function usePublishCmsDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cmsDownloadService.publish(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: cmsQueryKeys.bootstrap() })
    },
  })
}

export function useArchiveCmsDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cmsDownloadService.archive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadsQueryKeys.all })
    },
  })
}

export function useDeleteCmsDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cmsDownloadService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadsQueryKeys.all })
    },
  })
}

export function useReorderCmsDownloads() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => cmsDownloadService.reorder(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadsQueryKeys.all })
    },
  })
}

export function useHitCmsDownload() {
  return useMutation({
    mutationFn: (id: string) => cmsDownloadService.hit(id),
  })
}
