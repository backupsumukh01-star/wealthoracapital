'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { LoadingScreen } from '@/components/auth/loading-screen'
import { SuccessState } from '@/components/auth/success-state'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useResendVerification, useVerifyEmail } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-client'

/**
 * Email verification: the link from the welcome email carries `?token=…`, which this page
 * exchanges for a verified account automatically. No code is typed by hand.
 */
export function VerifyEmailPanel() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')?.trim().toLowerCase() ?? ''
  const from = searchParams.get('from')

  const verifyEmail = useVerifyEmail()
  const resendVerification = useResendVerification()
  const attempted = useRef(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!token || attempted.current) return
    attempted.current = true
    verifyEmail.mutate({ token })
    // verifyEmail is a stable mutate function from useMutation; token drives the single attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (token && verifyEmail.isPending) {
    return <LoadingScreen label="Verifying your email…" compact />
  }

  if (token && verifyEmail.isSuccess) {
    if (from === 'register' || from === 'login') {
      return (
        <SuccessState
          title="Email verified"
          description="Welcome to Growzy. Complete identity verification before investing."
          primaryAction={{ label: 'Continue onboarding', href: ROUTES.auth.onboarding }}
        />
      )
    }
    return (
      <SuccessState
        title="Email verified"
        description="You can now sign in to your account."
        primaryAction={{ label: 'Go to login', href: `${ROUTES.auth.login}?verified=1` }}
      />
    )
  }

  return (
    <AuthCard
      title="Verify your email"
      description={
        token
          ? 'That verification link is invalid or has expired. Request a new one below.'
          : email
            ? `We sent a verification link to ${email}. Open it on this device to continue.`
            : 'Check your inbox for a verification link to continue.'
      }
    >
      {token && verifyEmail.isError ? (
        <Alert tone="danger" title="Could not verify email">
          {verifyEmail.error instanceof ApiError
            ? verifyEmail.error.message
            : 'This link may have expired.'}
        </Alert>
      ) : null}

      <Button
        type="button"
        fullWidth
        size="lg"
        loading={resendVerification.isPending}
        disabled={!email || resent}
        onClick={() => {
          resendVerification.mutate(
            { email },
            {
              onSuccess: () => {
                setResent(true)
                toast.success('Verification email resent')
              },
              onError: () => toast.error('Could not resend the email'),
            },
          )
        }}
      >
        {resent ? 'Email sent' : 'Resend verification email'}
      </Button>
    </AuthCard>
  )
}
