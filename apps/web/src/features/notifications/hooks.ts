'use client'

/**
 * Notification hooks. The unread badge polls on the fast stale time.
 *
 * Mark-read / mark-all-read / archive apply an optimistic patch to every cached list page and to
 * the unread count so the bell and the notification list update the instant the investor taps,
 * then reconcile with the server response.
 */

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { Notification } from '@meridian/shared'

import { notificationsApi } from './api'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { QueryHookOptions } from '@/lib/query-client'

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...notificationQueryKeys.all, 'list', filters ?? {}] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
}

type NotificationListPage = { items: Notification[]; nextCursor: string | null }
type UnreadCountPage = { count: number }
type ListCacheEntry = [QueryKey, NotificationListPage | undefined]

export function useNotifications(
  query?: { cursor?: string; unreadOnly?: boolean },
  options?: QueryHookOptions,
) {
  return useQuery<NotificationListPage>({
    queryKey: notificationQueryKeys.list(query),
    queryFn: () => notificationsApi.list(query),
    enabled: options?.enabled,
  })
}

export function useUnreadCount(options?: QueryHookOptions) {
  const enabled = options?.enabled
  return useQuery<UnreadCountPage>({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
    staleTime: QUERY_STALE_TIME.fast,
    refetchInterval: enabled === false ? false : QUERY_STALE_TIME.fast,
  })
}

function patchListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (page: NotificationListPage) => NotificationListPage,
): ListCacheEntry[] {
  const entries = queryClient.getQueriesData<NotificationListPage>({
    queryKey: [...notificationQueryKeys.all, 'list'],
  })
  for (const [key, page] of entries) {
    if (!page) continue
    queryClient.setQueryData(key, updater(page))
  }
  return entries
}

function restoreListCaches(queryClient: ReturnType<typeof useQueryClient>, entries: ListCacheEntry[]) {
  for (const [key, page] of entries) {
    queryClient.setQueryData(key, page)
  }
}

function bumpUnreadCount(queryClient: ReturnType<typeof useQueryClient>, delta: number) {
  const previous = queryClient.getQueryData<UnreadCountPage>(notificationQueryKeys.unreadCount())
  if (!previous) return undefined
  queryClient.setQueryData(notificationQueryKeys.unreadCount(), {
    count: Math.max(0, previous.count + delta),
  })
  return previous
}

interface MutationContext {
  previousLists: ListCacheEntry[]
  previousCount?: UnreadCountPage
}

export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation<Notification, Error, string, MutationContext>({
    mutationFn: (id) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      let wasUnread = false
      const previousLists = patchListCaches(queryClient, (page) => ({
        ...page,
        items: page.items.map((n) => {
          if (n.id !== id) return n
          if (!n.readAt) wasUnread = true
          return n.readAt ? n : { ...n, readAt: new Date().toISOString() }
        }),
      }))
      const previousCount = wasUnread ? bumpUnreadCount(queryClient, -1) : undefined
      return { previousLists, previousCount }
    },
    onError: (_error, _id, context) => {
      if (!context) return
      restoreListCaches(queryClient, context.previousLists)
      if (context.previousCount) {
        queryClient.setQueryData(notificationQueryKeys.unreadCount(), context.previousCount)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()

  return useMutation<null, Error, void, MutationContext>({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      const now = new Date().toISOString()
      const previousLists = patchListCaches(queryClient, (page) => ({
        ...page,
        items: page.items.map((n) => (n.readAt ? n : { ...n, readAt: now })),
      }))
      const previousCount = queryClient.getQueryData<UnreadCountPage>(notificationQueryKeys.unreadCount())
      queryClient.setQueryData(notificationQueryKeys.unreadCount(), { count: 0 })
      return { previousLists, previousCount }
    },
    onError: (_error, _vars, context) => {
      if (!context) return
      restoreListCaches(queryClient, context.previousLists)
      if (context.previousCount) {
        queryClient.setQueryData(notificationQueryKeys.unreadCount(), context.previousCount)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })
    },
  })
}

export function useArchiveNotification() {
  const queryClient = useQueryClient()

  return useMutation<null, Error, string, MutationContext>({
    mutationFn: (id) => notificationsApi.archive(id),
    onMutate: async (id) => {
      let wasUnread = false
      const previousLists = patchListCaches(queryClient, (page) => {
        const target = page.items.find((n) => n.id === id)
        if (target && !target.readAt) wasUnread = true
        return { ...page, items: page.items.filter((n) => n.id !== id) }
      })
      const previousCount = wasUnread ? bumpUnreadCount(queryClient, -1) : undefined
      return { previousLists, previousCount }
    },
    onError: (_error, _id, context) => {
      if (!context) return
      restoreListCaches(queryClient, context.previousLists)
      if (context.previousCount) {
        queryClient.setQueryData(notificationQueryKeys.unreadCount(), context.previousCount)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })
    },
  })
}
