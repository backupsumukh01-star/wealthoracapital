'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ROUTES } from '@meridian/shared'

import { AuthCard } from '@/components/auth/auth-card'
import { Spinner } from '@/components/ui/spinner'
import { authQueryKeys } from '@/features/auth/hooks'
import { ensureCsrfToken } from '@/lib/csrf'
import { authService } from '@/services/auth.service'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  not_configured: 'Google sign-in is not available yet. Use email instead.',
  invalid_state: 'Google sign-in expired. Please try again.',
  account_suspended: 'This account has been suspended.',
  forbidden: 'Google sign-in was blocked for this account.',
  oauth_failed: 'Google sign-in could not be completed.',
}

function OAuthCallbackInner() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (error) {
      const reason = OAUTH_ERROR_MESSAGES[error] ? error : 'oauth_failed'
      const next = searchParams.get('next')
      if (next === 'admin') {
        router.replace(`${ROUTES.admin.login}?oauth=${encodeURIComponent(reason)}`)
        return
      }
      router.replace(`${ROUTES.auth.login}?oauth=${encodeURIComponent(reason)}`)
      return
    }

    // Cookies were set on the API domain during the Google redirect — hydrate session.
    void ensureCsrfToken(true)
      .then(() => authService.me())
      .then(async (session) => {
        queryClient.setQueryData(authQueryKeys.session(), session)
        // Ensure refresh cookie works for the new session family.
        try {
          await authService.refresh()
          await ensureCsrfToken(true)
        } catch {
          // Access token may still be valid; continue.
        }
        const next = searchParams.get('next')
        const isStaff =
          session.user.role === 'ADMIN' ||
          session.user.role === 'SUPER_ADMIN' ||
          Boolean(session.user.staffRole)

        if (next === 'admin') {
          if (!isStaff) {
            router.replace(`${ROUTES.admin.login}?oauth=forbidden`)
            return
          }
          router.replace(ROUTES.admin.root)
          return
        }

        router.replace(
          session.user.kycStatus === 'APPROVED' ? ROUTES.dashboard.root : ROUTES.auth.onboarding,
        )
      })
      .catch(() => {
        queryClient.setQueryData(authQueryKeys.session(), null)
        const next = searchParams.get('next')
        if (next === 'admin') {
          router.replace(`${ROUTES.admin.login}?oauth=oauth_failed`)
          return
        }
        router.replace(`${ROUTES.auth.login}?oauth=oauth_failed`)
      })
  }, [error, router, queryClient, searchParams])

  return (
    <AuthCard
      title={error ? 'Sign-in failed' : 'Finishing sign-in'}
      description={
        error
          ? OAUTH_ERROR_MESSAGES[error] ?? OAUTH_ERROR_MESSAGES.oauth_failed
          : 'Completing Google sign-in…'
      }
    >
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    </AuthCard>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  )
}
