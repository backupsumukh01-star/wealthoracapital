'use client'

import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '@/components/common/page-header'
import { Card } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { emailAdminService } from '@/services/email-admin.service'

export function AdminEmailOutbox() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'email-outbox'],
    queryFn: () => emailAdminService.listOutbox(),
  })
  const emails = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email outbox"
        description="Transactional mail from the admin email API."
      />

      {emails.length === 0 ? (
        <Card className="p-8 text-center text-body-sm text-fg-muted">
          {isLoading
            ? 'Loading outbox…'
            : isError
              ? 'No outbox data from API'
              : 'No outbox data from API'}
        </Card>
      ) : (
        <ul className="space-y-3">
          {emails.map((em) => (
            <li key={em.id}>
              <Card className="space-y-1.5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-fg">{em.subject}</p>
                  <span className="text-caption text-fg-subtle">
                    {formatDateTime(em.sentAt ?? em.createdAt)}
                  </span>
                </div>
                <p className="text-caption text-fg-muted">
                  To {em.to} · {em.templateKey ?? em.status}
                </p>
                <p className="text-body-sm text-fg-subtle">
                  {em.status}
                  {em.lastError ? ` · ${em.lastError}` : ''}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
