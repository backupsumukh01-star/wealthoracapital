'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Home, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/constants'

/**
 * The route-level error boundary.
 *
 * It deliberately shows the digest and nothing else. A stack trace or an raw error message can
 * leak internal structure, and the user cannot act on either (docs/14 §4).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Replaced by the Sentry client once observability lands (docs/15 §6).
    console.error(error)
  }, [error])

  return (
    <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-8 py-20 text-center">
      <div className="space-y-3">
        <p className="text-overline text-danger">Something went wrong</p>
        <h1 className="text-display-md text-fg">We could not load this page</h1>
        <p className="prose-measure text-body-md mx-auto text-fg-muted">
          The problem has been recorded. Nothing was charged and no balance changed. Try again. If
          it keeps happening, contact{' '}
          <a
            className="break-all rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
            href={`mailto:${SITE.supportEmail}`}
          >
            {SITE.supportEmail}
          </a>
          .
        </p>
        {error.digest ? (
          <p className="text-caption font-mono text-fg-subtle">Reference: {error.digest}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href={ROUTES.marketing.home}>
            <Home aria-hidden />
            Back to home
          </Link>
        </Button>
      </div>
    </main>
  )
}
