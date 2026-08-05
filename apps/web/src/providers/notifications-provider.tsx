'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { formatRelative, type Notification, type NotificationType } from '@meridian/shared'

import {
  useArchiveNotification,
  useMarkAllRead,
  useMarkRead,
  useNotifications as useNotificationsQuery,
} from '@/features/notifications/hooks'
import { useSession } from '@/providers/session-provider'

export type { NotificationType }
export type NotificationCategory = 'money' | 'security' | 'all'

export type AppNotification = {
  id: string
  type: NotificationType
  title: string
  body: string
  time: string
  unread: boolean
  archived?: boolean
  group: 'Today' | 'Earlier'
  category: NotificationCategory
}

const SECURITY_TYPES = new Set<NotificationType>([
  'ACCOUNT_SECURITY',
  'KYC_APPROVED',
  'KYC_REJECTED',
  'KYC_INFO_REQUESTED',
])

const MONEY_TYPES = new Set<NotificationType>([
  'DEPOSIT_SUBMITTED',
  'DEPOSIT_APPROVED',
  'DEPOSIT_REJECTED',
  'WITHDRAWAL_SUBMITTED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'WITHDRAWAL_PAID',
  'DAILY_PROFIT',
  'DAILY_LOSS',
])

function categoryOf(type: NotificationType): NotificationCategory {
  if (SECURITY_TYPES.has(type)) return 'security'
  if (MONEY_TYPES.has(type)) return 'money'
  return 'all'
}

function isToday(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

function toAppNotification(n: Notification): AppNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    time: formatRelative(n.createdAt),
    unread: n.readAt === null,
    archived: false,
    group: isToday(n.createdAt) ? 'Today' : 'Earlier',
    category: categoryOf(n.type),
  }
}

type NotificationsContextValue = {
  items: AppNotification[]
  unreadCount: number
  isLoading: boolean
  markRead: (id: string) => void
  markAllRead: () => void
  archive: (id: string) => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSession()

  const { data, isLoading } = useNotificationsQuery(undefined, { enabled: isAuthenticated })
  const markReadMutation = useMarkRead()
  const markAllReadMutation = useMarkAllRead()
  const archiveMutation = useArchiveNotification()

  const items = useMemo(() => {
    if (!isAuthenticated || !data) return []
    return data.items.map(toAppNotification)
  }, [isAuthenticated, data])

  const markRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id)
    },
    [markReadMutation],
  )

  const markAllRead = useCallback(() => {
    markAllReadMutation.mutate()
  }, [markAllReadMutation])

  const archive = useCallback(
    (id: string) => {
      archiveMutation.mutate(id)
    },
    [archiveMutation],
  )

  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items])

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unreadCount,
      isLoading: isAuthenticated ? isLoading : false,
      markRead,
      markAllRead,
      archive,
    }),
    [items, unreadCount, isLoading, isAuthenticated, markRead, markAllRead, archive],
  )

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return ctx
}

export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null
  if (count > 9) return '9+'
  return String(count)
}
