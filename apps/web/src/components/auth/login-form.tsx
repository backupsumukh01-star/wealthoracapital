'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_ROUTES, ERROR_CODES, ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { ErrorDialog } from '@/components/auth/success-dialog'
import { PasswordField } from '@/components/auth/password-field'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-client'
import { loginSchema, type LoginInput } from '@/lib/auth-schemas'
import { env } from '@/lib/env'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: false },
  })

  const oauth = searchParams.get('oauth')
  const banner =
    searchParams.get('verified') === '1'
      ? 'Email verified. You can sign in now.'
      : searchParams.get('reset') === '1'
        ? 'Password updated. Sign in with your new password.'
        : oauth === 'access_denied'
          ? 'Google sign-in was cancelled. Try again or use email.'
          : oauth === 'not_configured'
            ? 'Google sign-in is not configured on this environment.'
            : oauth === 'invalid_state'
              ? 'Google sign-in expired. Please try again.'
              : oauth === 'account_suspended'
                ? 'This account has been suspended.'
                : oauth === 'forbidden'
                  ? 'Google sign-in was blocked for this account.'
                  : oauth === 'failed' || oauth === 'oauth_failed'
                    ? 'Google sign-in did not complete. Try again or use email.'
                    : null

  const bannerTone = oauth && oauth !== 'verified' ? 'danger' : 'success'

  function goAfterLogin(kycStatus: string) {
    const next = searchParams.get('next')
    const dest =
      next && next.startsWith('/') && !next.startsWith('//')
        ? next
        : kycStatus === 'APPROVED'
          ? ROUTES.dashboard.root
          : ROUTES.auth.onboarding
    router.push(dest)
    router.refresh()
  }

  function handleGoogle() {
    const redirectTo = `${env.NEXT_PUBLIC_SITE_URL}${ROUTES.auth.oauthCallback}`
    window.location.href = `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.auth.google}?redirect=${encodeURIComponent(redirectTo)}`
  }

  async function onSubmit(values: LoginInput) {
    setFormError(null)
    try {
      const session = await login.mutateAsync({
        identifier: values.identifier,
        password: values.password,
      })
      toast.success('Signed in successfully.')
      goAfterLogin(session.user.kycStatus)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === ERROR_CODES.EMAIL_NOT_VERIFIED) {
          toast.message('Verify your email to continue.')
          router.push(
            `${ROUTES.auth.verifyEmail}?email=${encodeURIComponent(values.identifier)}&from=login`,
          )
          return
        }
        setFormError(error.message)
        setErrorOpen(true)
        return
      }
      setFormError('Sign-in failed')
      setErrorOpen(true)
    }
  }

  return (
    <>
      <AuthCard
        title="Welcome back"
        description="Sign in to your Growzy account."
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
        <SocialLoginButtons googleLabel="Continue with Google" onGoogle={handleGoogle} />

        <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          {banner ? (
            <Alert
              tone={bannerTone === 'danger' ? 'danger' : 'success'}
              title={bannerTone === 'danger' ? 'Google sign-in' : 'Ready to continue'}
            >
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

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isSubmitting || login.isPending}
            loadingText="Signing in…"
          >
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
