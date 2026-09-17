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
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useResendVerification, useVerifyEmail } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-client'

const RESEND_COOLDOWN_SEC = 60

/**
 * Email verification: the link from the welcome email carries `?token=…`, which this page
 * exchanges for a verified account automatically. No code is typed by hand.
 */
export function VerifyEmailPanel() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const initialEmail = searchParams.get('email')?.trim().toLowerCase() ?? ''
  const from = searchParams.get('from')

  const verifyEmail = useVerifyEmail()
  const resendVerification = useResendVerification()
  const attempted = useRef(false)
  const [email, setEmail] = useState(initialEmail)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!token || attempted.current) return
    attempted.current = true
    verifyEmail.mutate({ token })
    // verifyEmail is a stable mutate function from useMutation; token drives the single attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  if (token && verifyEmail.isPending) {
    return <LoadingScreen label="Verifying your email…" compact />
  }

  if (token && verifyEmail.isSuccess) {
    if (from === 'register' || from === 'login') {
      return (
        <SuccessState
          title="Email verified"
          description="Welcome to Wealthora. Complete identity verification before investing."
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

  const canResend = Boolean(email.trim()) && cooldown === 0 && !resendVerification.isPending

  return (
    <AuthCard
      title="Verify your email"
      description={
        token
          ? 'That verification link is invalid or has expired. Request a new one below.'
          : email
            ? `We sent a verification link to ${email}. Open it on this device to continue.`
            : 'Enter your email to resend the verification link.'
      }
    >
      {token && verifyEmail.isError ? (
        <Alert tone="danger" title="Could not verify email">
          {verifyEmail.error instanceof ApiError
            ? verifyEmail.error.message
            : 'This link may have expired.'}
        </Alert>
      ) : null}

      {!initialEmail ? (
        <FormField label="Email" required>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
          />
        </FormField>
      ) : null}

      <Button
        type="button"
        fullWidth
        size="lg"
        loading={resendVerification.isPending}
        disabled={!canResend}
        onClick={() => {
          const target = email.trim().toLowerCase()
          if (!target) {
            toast.error('Enter your email address')
            return
          }
          resendVerification.mutate(
            { email: target },
            {
              onSuccess: () => {
                setCooldown(RESEND_COOLDOWN_SEC)
                toast.success('Verification email resent', {
                  description: 'Check your inbox and spam folder.',
                })
              },
              onError: (error) => {
                const message =
                  error instanceof ApiError
                    ? error.message
                    : 'Could not resend the email'
                toast.error(message)
                if (error instanceof ApiError && error.code === 'RATE_LIMITED') {
                  const retry =
                    typeof (error.details as { retryAfterSec?: number } | undefined)
                      ?.retryAfterSec === 'number'
                      ? (error.details as { retryAfterSec: number }).retryAfterSec
                      : RESEND_COOLDOWN_SEC
                  setCooldown(retry)
                }
              },
            },
          )
        }}
      >
        {cooldown > 0
          ? `Resend available in ${cooldown}s`
          : 'Resend verification email'}
      </Button>
    </AuthCard>
  )
}
