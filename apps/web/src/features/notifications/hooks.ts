/** Notification hooks. Scaffold. The unread badge polls on the fast stale time. */

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...notificationQueryKeys.all, 'list', filters ?? {}] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
}
