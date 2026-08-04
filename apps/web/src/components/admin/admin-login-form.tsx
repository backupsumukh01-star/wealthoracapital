'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { Shield } from 'lucide-react'
import { toast } from 'sonner'

import { LogoMark } from '@/components/common/logo'
import { OtpInput } from '@/components/auth/otp-input'
import { PasswordField } from '@/components/auth/password-field'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { ADMIN_DEMO } from '@/lib/admin-demo-data'
import { setAdminSession } from '@/lib/demo-admin-auth'

type Step = 'credentials' | 'otp' | 'forgot'

/**
 * Separate operator login — email, password, 2FA, forgot password (UI demo).
 */
export function AdminLoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    await new Promise((r) => setTimeout(r, 500))
    setBusy(false)
    if (
      email.trim().toLowerCase() !== ADMIN_DEMO.email ||
      password !== ADMIN_DEMO.password
    ) {
      setError('Incorrect admin email or password.')
      return
    }
    setStep('otp')
    toast.message('Authenticator required', { description: `Demo OTP: ${ADMIN_DEMO.otp}` })
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (otp !== ADMIN_DEMO.otp) {
      setError(`Invalid authenticator code. Demo: ${ADMIN_DEMO.otp}`)
      return
    }
    setBusy(true)
    await new Promise((r) => setTimeout(r, 400))
    setAdminSession()
    setBusy(false)
    toast.success('Welcome to Growzy Ops')
    router.push(ROUTES.admin.root)
    router.refresh()
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await new Promise((r) => setTimeout(r, 600))
    setBusy(false)
    toast.success('Reset link sent (demo)', {
      description: forgotEmail || 'Check your inbox',
    })
    setStep('credentials')
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
            <p className="text-overline text-warning">Operator console</p>
            <h1 className="mt-1 text-heading-xl text-fg">Admin sign-in</h1>
            <p className="mt-1 text-body-sm text-fg-muted">
              Separate from investor login. 2FA required.
            </p>
          </div>
        </div>

        {error ? (
          <Alert tone="danger" title="Could not continue">
            {error}
          </Alert>
        ) : null}

        {step === 'credentials' ? (
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
            <p className="text-center text-[11px] text-fg-subtle">
              Demo: {ADMIN_DEMO.email} · {ADMIN_DEMO.password}
            </p>
          </form>
        ) : null}

        {step === 'otp' ? (
          <form className="space-y-4" onSubmit={(e) => void submitOtp(e)}>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-caption text-fg-muted">
              <Shield className="size-4 text-accent-300" aria-hidden />
              Enter the 6-digit authenticator code
            </div>
            <OtpInput value={otp} onChange={setOtp} autoFocus />
            <Button type="submit" fullWidth size="lg" loading={busy} disabled={otp.length !== 6}>
              Verify & enter console
            </Button>
            <button
              type="button"
              className="w-full text-center text-caption text-fg-muted hover:text-fg"
              onClick={() => setStep('credentials')}
            >
              Back
            </button>
          </form>
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
