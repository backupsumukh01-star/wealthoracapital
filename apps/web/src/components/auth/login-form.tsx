'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { ErrorDialog } from '@/components/auth/success-dialog'
import { OtpInput } from '@/components/auth/otp-input'
import { PasswordField } from '@/components/auth/password-field'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { loginSchema, wait, type LoginInput } from '@/lib/auth-schemas'
import { isOnboardingComplete } from '@/lib/demo-auth'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, loginWithGoogle, completeLogin } = useInvestorLifecycle()
  const [formError, setFormError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [twoFaUserId, setTwoFaUserId] = useState<string | null>(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaBusy, setTwoFaBusy] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: false },
  })

  const banner =
    searchParams.get('verified') === '1'
      ? 'Email verified. You can sign in now.'
      : searchParams.get('reset') === '1'
        ? 'Password updated. Sign in with your new password.'
        : searchParams.get('oauth') === 'failed'
          ? 'Google sign-in did not complete. Try again or use email.'
          : null

  function goAfterLogin(kycApproved: boolean) {
    const next = searchParams.get('next')
    const dest =
      next && next.startsWith('/') && !next.startsWith('//')
        ? next
        : kycApproved && isOnboardingComplete()
          ? ROUTES.dashboard.root
          : ROUTES.auth.onboarding
    router.push(dest)
    router.refresh()
  }

  async function onSubmit(values: LoginInput) {
    setFormError(null)
    await wait(500)
    const result = login(values.identifier, values.password)
    if (!result.ok) {
      if (result.account && !result.account.emailVerified) {
        toast.message('Verify your email to continue.')
        router.push(
          `${ROUTES.auth.verifyEmail}?email=${encodeURIComponent(result.account.email)}&from=login`,
        )
        return
      }
      setFormError(result.error ?? 'Sign-in failed')
      setErrorOpen(true)
      return
    }
    if (result.needsOtp && result.account) {
      setTwoFaUserId(result.account.userId)
      return
    }
    toast.success('Signed in successfully.')
    goAfterLogin(result.account?.kycStatus === 'APPROVED')
  }

  async function submitTwoFa() {
    if (!twoFaUserId) return
    setTwoFaBusy(true)
    await wait(400)
    const result = completeLogin(twoFaUserId, twoFaCode)
    setTwoFaBusy(false)
    if (!result.ok) {
      setFormError(result.error ?? 'Invalid code')
      setErrorOpen(true)
      return
    }
    toast.success('Signed in successfully.')
    goAfterLogin(result.account?.kycStatus === 'APPROVED')
  }

  if (twoFaUserId) {
    return (
      <AuthCard
        title="Authenticator code"
        description="Enter the 6-digit code from your authenticator app. Demo OTP: 123456"
      >
        <OtpInput value={twoFaCode} onChange={setTwoFaCode} autoFocus />
        <Button
          type="button"
          fullWidth
          size="lg"
          loading={twoFaBusy}
          disabled={twoFaCode.length !== 6}
          onClick={() => void submitTwoFa()}
        >
          Continue
        </Button>
      </AuthCard>
    )
  }

  return (
    <>
      <AuthCard
        title="Welcome back"
        description={
          <>
            Sign in to your Growzy account.
            <span className="mt-1 block text-caption text-fg-subtle">
              Demo: investor@growzy.com or ayesha · Growzy2026!
            </span>
          </>
        }
        footer={
          <>
            No account yet?{' '}
            <Link
              href={ROUTES.auth.register}
              className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
            >
              Register
            </Link>
          </>
        }
      >
        <SocialLoginButtons
          googleLabel="Continue with Google"
          onGoogle={() => {
            const account = loginWithGoogle()
            toast.success('Signed in with Google')
            goAfterLogin(account.kycStatus === 'APPROVED')
          }}
        />

        <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          {banner ? (
            <Alert tone="success" title="Ready to continue">
              {banner}
            </Alert>
          ) : null}

          {formError ? (
            <Alert tone="danger" title="Could not sign in">
              {formError}
            </Alert>
          ) : null}

          <FormField
            label="Email / Username"
            required
            error={errors.identifier?.message}
          >
            <Input
              autoComplete="username"
              placeholder="you@example.com or username"
              {...register('identifier')}
            />
          </FormField>

          <FormField label="Password" required error={errors.password?.message}>
            <PasswordField autoComplete="current-password" {...register('password')} />
          </FormField>

          <div className="flex items-center justify-between gap-4">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <CheckboxField
                  label="Remember me"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Link
              href={ROUTES.auth.forgotPassword}
              className="rounded-sm text-caption text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth size="lg" loading={isSubmitting} loadingText="Signing in…">
            Login
          </Button>
        </form>
      </AuthCard>

      <ErrorDialog
        open={errorOpen}
        onOpenChange={setErrorOpen}
        title="Sign-in failed"
        description={formError ?? 'Check your credentials and try again.'}
      />
    </>
  )
}
