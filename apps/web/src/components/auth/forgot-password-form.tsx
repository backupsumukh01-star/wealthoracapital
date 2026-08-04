'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { OtpInput } from '@/components/auth/otp-input'
import { OtpResend } from '@/components/auth/otp-resend'
import { PasswordField } from '@/components/auth/password-field'
import { SuccessState } from '@/components/auth/success-state'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  wait,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/lib/auth-schemas'
import { DEMO_OTP } from '@/lib/investor-lifecycle'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

type Step = 'email' | 'otp' | 'reset' | 'success'

/**
 * Forgot password: email → OTP → new password → confirmation email.
 */
export function ForgotPasswordForm() {
  const { requestPasswordReset, resetPassword, queueEmail } = useInvestorLifecycle()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpBusy, setOtpBusy] = useState(false)

  const emailForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function submitEmail(values: ForgotPasswordInput) {
    await wait(500)
    const normalized = values.email.trim().toLowerCase()
    requestPasswordReset(normalized)
    setEmail(normalized)
    setStep('otp')
    toast.success('OTP sent', { description: `Code: ${DEMO_OTP}` })
  }

  async function submitOtp() {
    setOtpError(null)
    if (otp.length !== 6) {
      setOtpError('Enter the 6-digit code')
      return
    }
    setOtpBusy(true)
    await wait(400)
    setOtpBusy(false)
    if (otp !== DEMO_OTP) {
      setOtpError(`Invalid code. Demo OTP is ${DEMO_OTP}.`)
      return
    }
    setStep('reset')
  }

  async function submitReset(values: ResetPasswordInput) {
    await wait(500)
    const result = resetPassword(email, otp, values.password)
    if (!result.ok) {
      toast.error(result.error ?? 'Could not reset password')
      return
    }
    queueEmail('PASSWORD_CHANGED', email)
    setStep('success')
  }

  if (step === 'success') {
    return (
      <SuccessState
        title="Password reset"
        description="Your password was updated. A confirmation email was sent. Sign in with your new credentials."
        primaryAction={{
          label: 'Back to login',
          href: `${ROUTES.auth.login}?reset=1`,
        }}
      />
    )
  }

  if (step === 'otp') {
    return (
      <AuthCard
        title="Enter OTP"
        description={
          <>
            Code sent to <span className="text-fg">{email}</span>. Demo:{' '}
            <span className="font-mono text-accent-300">{DEMO_OTP}</span>
          </>
        }
      >
        {otpError ? (
          <Alert tone="danger" title="Invalid code">
            {otpError}
          </Alert>
        ) : null}
        <OtpInput value={otp} onChange={setOtp} autoFocus error={Boolean(otpError)} />
        <OtpResend
          onResend={async () => {
            await wait(300)
            requestPasswordReset(email)
            toast.success('OTP resent', { description: `Code: ${DEMO_OTP}` })
          }}
        />
        <Button
          type="button"
          fullWidth
          size="lg"
          loading={otpBusy}
          disabled={otp.length !== 6}
          onClick={() => void submitOtp()}
        >
          Verify OTP
        </Button>
      </AuthCard>
    )
  }

  if (step === 'reset') {
    return (
      <AuthCard title="Create new password" description="Choose a strong password you have not used elsewhere.">
        <form className="space-y-4" noValidate onSubmit={resetForm.handleSubmit(submitReset)}>
          <FormField label="New password" required error={resetForm.formState.errors.password?.message}>
            <PasswordField showStrength autoComplete="new-password" {...resetForm.register('password')} />
          </FormField>
          <FormField
            label="Confirm password"
            required
            error={resetForm.formState.errors.confirmPassword?.message}
          >
            <PasswordField autoComplete="new-password" {...resetForm.register('confirmPassword')} />
          </FormField>
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={resetForm.formState.isSubmitting}
            loadingText="Saving…"
          >
            Update password
          </Button>
        </form>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your email. We will send a 6-digit OTP to reset your password."
      footer={
        <>
          Remembered it?{' '}
          <Link
            href={ROUTES.auth.login}
            className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Login
          </Link>
        </>
      }
    >
      <form className="space-y-5" noValidate onSubmit={emailForm.handleSubmit(submitEmail)}>
        <FormField label="Email" required error={emailForm.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...emailForm.register('email')} />
        </FormField>
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={emailForm.formState.isSubmitting}
          loadingText="Sending…"
        >
          Send OTP
        </Button>
      </form>
    </AuthCard>
  )
}
