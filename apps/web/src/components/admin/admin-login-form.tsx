'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_ROUTES, ROUTES } from '@meridian/shared'

import { LogoMark } from '@/components/common/logo'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { Alert } from '@/components/ui/alert'
import { env } from '@/lib/env'
import { isSalesOwnerNext, safeStaffNext } from '@/lib/staff-next'
import { useSession } from '@/providers/session-provider'

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  not_configured: 'Google admin sign-in is not configured yet.',
  invalid_state: 'Google sign-in expired. Please try again.',
  account_suspended: 'This account has been suspended.',
  forbidden: 'This Google account is not on the admin allowlist.',
  oauth_failed: 'Google sign-in did not complete. Try again.',
}

/**
 * Operator console — Google OAuth only.
 * Allowed emails come from API env: GOOGLE_SUPER_ADMIN_EMAILS / GOOGLE_ADMIN_EMAILS.
 * No password login on this surface.
 */
export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isStaff, isLoading } = useSession()
  const oauth = searchParams.get('oauth')
  const error = oauth ? OAUTH_ERRORS[oauth] ?? OAUTH_ERRORS.oauth_failed : null
  const next = safeStaffNext(searchParams.get('next'))
  const salesOwner = isSalesOwnerNext(next)

  useEffect(() => {
    if (!isLoading && isAuthenticated && isStaff) {
      router.replace(next)
    }
  }, [isLoading, isAuthenticated, isStaff, next, router])

  function handleGoogle() {
    const redirectTo = `${env.NEXT_PUBLIC_SITE_URL}${ROUTES.auth.oauthCallback}?next=${encodeURIComponent(next)}`
    window.location.href = `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.auth.google}?redirect=${encodeURIComponent(redirectTo)}`
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-base px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[40vh] w-[70vw] -translate-x-1/2 rounded-full bg-accent-500/20 blur-3xl"
        aria-hidden
      />

      <div className="glass glass-edge relative w-full max-w-md space-y-6 rounded-2xl p-6 shadow-e4 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-full bg-accent-500/20 blur-xl" />
            <LogoMark className="relative size-12" />
          </div>
          <div>
            <p className="text-overline text-warning">
              {salesOwner ? 'Sales Owner' : 'Operator console'}
            </p>
            <h1 className="mt-1 text-heading-xl text-fg">
              {salesOwner ? 'Sales Owner sign-in' : 'Admin sign-in'}
            </h1>
            <p className="mt-1 text-body-sm text-fg-muted">
              {salesOwner
                ? 'Use your allowlisted Google admin account. After sign-in you will open the Sales Owner portal, not the admin console.'
                : 'Sign in with an allowlisted Google account. No password on this page.'}
            </p>
          </div>
        </div>

        {error ? (
          <Alert tone="danger" title="Could not continue">
            {error}
          </Alert>
        ) : null}

        <SocialLoginButtons googleLabel="Continue with Google" onGoogle={handleGoogle} />

        <p className="text-center text-caption text-fg-subtle">
          Investor account?{' '}
          <Link href={ROUTES.auth.login} className="text-accent-300 hover:underline">
            Investor login
          </Link>
        </p>
      </div>
    </div>
  )
}
