'use client'

import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { salesQueryErrorMessage } from '@/features/sales/auth-errors'
import { isSalesForbidden, isSalesUnauthorized } from '@/features/sales/auth-errors'

export function SalesQueryError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  const title = isSalesForbidden(error)
    ? 'Access denied'
    : isSalesUnauthorized(error)
      ? 'Session required'
      : 'Could not load this view'

  return (
    <Alert
      tone="danger"
      title={title}
      action={
        onRetry ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    >
      {salesQueryErrorMessage(error)}
    </Alert>
  )
}

export function SalesEmptyNetwork({
  title = 'No customers in this network yet',
  description = 'Attributed customers and their investor referral descendants will appear here.',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={action}
    />
  )
}
