'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { salesQueryErrorMessage } from '@/features/sales/auth-errors'
import { useSalesMe } from '@/features/sales/hooks'
import { salesService } from '@/services/sales.service'

function safeNext(pathname: string): string {
  if (!pathname.startsWith(ROUTES.sales.root)) return ROUTES.sales.dashboard
  if (pathname.startsWith(ROUTES.sales.owner.root)) return ROUTES.sales.dashboard
  if (pathname === ROUTES.sales.login) return ROUTES.sales.dashboard
  return pathname
}

/**
 * UI gate only. `/sales/me` and cookie refresh remain the real authorization.
 */
export function SalesSessionGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data, isLoading, isError, error, refetch } = useSalesMe()

  useEffect(() => {
    if (isLoading || isError) return
    if (data?.salesman) return
    if (data !== null) return

    const next = safeNext(`${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`)
    void salesService.logout().catch(() => undefined)
    router.replace(`${ROUTES.sales.login}?next=${encodeURIComponent(next)}`)
  }, [data, isError, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-base px-4 text-caption text-fg-muted">
        <div className="flex items-center gap-2">
          <Spinner label="Checking sales session" />
          Checking sales session…
        </div>
      </div>
    )
  }

  if (data?.salesman) {
    return <>{children}</>
  }

  if (isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-base px-4">
        <div className="w-full max-w-md space-y-3">
          <Alert
            tone="danger"
            title="Could not verify your sales session"
            action={
              <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          >
            {salesQueryErrorMessage(error)}
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-base px-4 text-caption text-fg-muted">
      Redirecting to sales sign-in…
    </div>
  )
}
