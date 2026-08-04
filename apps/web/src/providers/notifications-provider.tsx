'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { RECENT_NOTIFICATIONS } from '@/lib/dashboard-data'

export type NotificationType =
  | 'DAILY_PROFIT'
  | 'DEPOSIT_APPROVED'
  | 'WITHDRAWAL_APPROVED'
  | 'ANNOUNCEMENT'
  | 'SECURITY'

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

const STORAGE_KEY = 'growzy_notifications_v2'

function categoryOf(type: NotificationType): NotificationCategory {
  if (type === 'SECURITY') return 'security'
  if (type === 'ANNOUNCEMENT') return 'all'
  return 'money'
}

function seedNotifications(): AppNotification[] {
  return RECENT_NOTIFICATIONS.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    time: n.time,
    unread: n.unread,
    archived: false,
    group: n.unread ? 'Today' : 'Earlier',
    category: categoryOf(n.type),
  }))
}

function readStored(): AppNotification[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppNotification[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

function persist(items: AppNotification[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

type NotificationsContextValue = {
  items: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  archive: (id: string) => void
  pushNotification: (input: {
    type: NotificationType
    title: string
    body: string
  }) => void
  /** @deprecated use pushNotification */
  receiveDemo: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>(() => seedNotifications())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = readStored()
    if (stored) setItems(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    persist(items)
  }, [items, hydrated])

  const pushNotification = useCallback(
    (input: { type: NotificationType; title: string; body: string }) => {
      const id = `n-${Date.now()}`
      setItems((prev) => [
        {
          id,
          type: input.type,
          title: input.title,
          body: input.body,
          time: 'Just now',
          unread: true,
          archived: false,
          group: 'Today',
          category: categoryOf(input.type),
        },
        ...prev,
      ])
    },
    [],
  )

  useEffect(() => {
    function onNotify(e: Event) {
      const detail = (e as CustomEvent).detail as {
        type?: NotificationType
        title?: string
        body?: string
      }
      if (!detail?.title || !detail?.body) return
      pushNotification({
        type: detail.type ?? 'ANNOUNCEMENT',
        title: detail.title,
        body: detail.body,
      })
    }
    window.addEventListener('growzy:notify', onNotify)
    return () => window.removeEventListener('growzy:notify', onNotify)
  }, [pushNotification])

  const markRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id && n.unread ? { ...n, unread: false } : n)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => (n.unread ? { ...n, unread: false } : n)))
  }, [])

  const archive = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: true, unread: false } : n)),
    )
  }, [])

  const receiveDemo = useCallback(() => {
    pushNotification({
      type: 'DAILY_PROFIT',
      title: 'Live desk update',
      body: 'A new return was posted to your wallet (demo).',
    })
  }, [pushNotification])

  const unreadCount = useMemo(
    () => items.filter((n) => n.unread && !n.archived).length,
    [items],
  )

  const visible = useMemo(() => items.filter((n) => !n.archived), [items])

  const value = useMemo(
    () => ({
      items: visible,
      unreadCount,
      markRead,
      markAllRead,
      archive,
      pushNotification,
      receiveDemo,
    }),
    [visible, unreadCount, markRead, markAllRead, archive, pushNotification, receiveDemo],
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
