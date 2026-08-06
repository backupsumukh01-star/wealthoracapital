'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { API_ROUTES, ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { LogoMark } from '@/components/common/logo'
import { AuthDivider } from '@/components/auth/auth-divider'
import { PasswordField } from '@/components/auth/password-field'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useForgotPassword, useLogin, useLogout } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-client'
import { env } from '@/lib/env'
import { useSession } from '@/providers/session-provider'

type Step = 'credentials' | 'forgot'

/**
 * Operator login — same `/auth/login` endpoint as investors. Access to the console is
 * granted when the session is staff (`ADMIN`/`SUPER_ADMIN` role or any `staffRole`).
 */
export function AdminLoginForm() {
  const router = useRouter()
  const { isAuthenticated, isStaff, isLoading } = useSession()
  const login = useLogin()
  const logout = useLogout()
  const forgotPassword = useForgotPassword()
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [forgotEmail, setForgotEmail] = useState('')

  useEffect(() => {
    if (!isLoading && isAuthenticated && isStaff) {
      router.replace(ROUTES.admin.root)
    }
  }, [isLoading, isAuthenticated, isStaff, router])

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const session = await login.mutateAsync({ identifier: email, password })
      const staff =
        session.user.role === 'ADMIN' ||
        session.user.role === 'SUPER_ADMIN' ||
        Boolean(session.user.staffRole)
      if (!staff) {
        await logout.mutateAsync().catch(() => undefined)
        setError('This account does not have operator access.')
        return
      }
      toast.success('Welcome to Growzy Ops')
      router.push(ROUTES.admin.root)
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Incorrect admin email or password.')
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault()
    try {
      await forgotPassword.mutateAsync({ email: forgotEmail.trim().toLowerCase() })
    } catch {
      // Enumeration-safe: show the same success state regardless of outcome.
    }
    toast.success('Reset link sent', {
      description: forgotEmail || 'Check your inbox',
    })
    setStep('credentials')
  }

  const busy = login.isPending || logout.isPending || forgotPassword.isPending

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
            <p className="text-overline text-warning">Operator console</p>
            <h1 className="mt-1 text-heading-xl text-fg">Admin sign-in</h1>
            <p className="mt-1 text-body-sm text-fg-muted">
              Separate login surface from investors. Operator role required.
            </p>
          </div>
        </div>

        {error ? (
          <Alert tone="danger" title="Could not continue">
            {error}
          </Alert>
        ) : null}

        {step === 'credentials' ? (
          <div className="space-y-4">
            <SocialLoginButtons
              googleLabel="Continue with Google"
              onGoogle={() => {
                const redirectTo = `${env.NEXT_PUBLIC_SITE_URL}${ROUTES.auth.oauthCallback}?next=admin`
                window.location.href = `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.auth.google}?redirect=${encodeURIComponent(redirectTo)}`
              }}
            />
            <AuthDivider label="or use email" />
            <form className="space-y-4" onSubmit={(e) => void submitCredentials(e)}>
              <FormField label="Admin email" required>
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@growzy.com"
                />
              </FormField>
              <FormField label="Password" required>
                <PasswordField
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-caption text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                  onClick={() => {
                    setError(null)
                    setStep('forgot')
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" fullWidth size="lg" loading={busy}>
                Continue
              </Button>
            </form>
          </div>
        ) : null}

        {step === 'forgot' ? (
          <form className="space-y-4" onSubmit={(e) => void submitForgot(e)}>
            <FormField label="Admin email" required>
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="admin@growzy.com"
              />
            </FormField>
            <Button type="submit" fullWidth size="lg" loading={busy}>
              Send reset link
            </Button>
            <button
              type="button"
              className="w-full text-center text-caption text-fg-muted hover:text-fg"
              onClick={() => setStep('credentials')}
            >
              Back to sign-in
            </button>
          </form>
        ) : null}

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
