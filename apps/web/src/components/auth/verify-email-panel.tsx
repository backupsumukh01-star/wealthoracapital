'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { OtpInput } from '@/components/auth/otp-input'
import { OtpResend } from '@/components/auth/otp-resend'
import { ErrorDialog, SuccessDialog } from '@/components/auth/success-dialog'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DEMO_OTP } from '@/lib/investor-lifecycle'
import { wait } from '@/lib/auth-schemas'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

/**
 * Email verification via 6-digit OTP. Demo code: 123456.
 */
export function VerifyEmailPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyEmail, queueEmail } = useInvestorLifecycle()
  const email = searchParams.get('email')?.trim().toLowerCase() || 'you@example.com'
  const from = searchParams.get('from')

  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  async function verify() {
    setError(null)
    if (otp.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }
    setSubmitting(true)
    await wait(500)
    const result = verifyEmail(email, otp)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error ?? 'Invalid code')
      setErrorOpen(true)
      return
    }

    if (from === 'register' || from === 'login') {
      setSuccessOpen(true)
      return
    }

    toast.success('Email verified')
    router.push(`${ROUTES.auth.login}?verified=1`)
  }

  return (
    <>
      <AuthCard
        title="Verify your email"
        description={
          <>
            We sent a 6-digit code to <span className="text-fg">{email}</span>. Demo code:{' '}
            <span className="font-mono text-accent-300">{DEMO_OTP}</span>
          </>
        }
        footer={
          <>
            Wrong email?{' '}
            <Link
              href={ROUTES.auth.register}
              className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Register again
            </Link>
          </>
        }
      >
        {error ? (
          <Alert tone="danger" title="Verification failed">
            {error}
          </Alert>
        ) : null}

        <OtpInput value={otp} onChange={setOtp} autoFocus error={Boolean(error)} />

        <OtpResend
          onResend={async () => {
            await wait(300)
            queueEmail('VERIFY_EMAIL', email)
            toast.success('OTP resent', { description: `Code: ${DEMO_OTP}` })
          }}
        />

        <Button
          type="button"
          fullWidth
          size="lg"
          loading={submitting}
          loadingText="Verifying…"
          disabled={otp.length !== 6}
          onClick={() => void verify()}
        >
          Verify
        </Button>
      </AuthCard>

      <ErrorDialog
        open={errorOpen}
        onOpenChange={setErrorOpen}
        title="Invalid OTP"
        description={error ?? 'Check the code and try again.'}
      />

      <SuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        title="Email verified"
        description="Welcome to Growzy. Complete identity verification before investing."
        primaryLabel="Continue onboarding"
        onPrimary={() => router.push(ROUTES.auth.onboarding)}
      />
    </>
  )
}
