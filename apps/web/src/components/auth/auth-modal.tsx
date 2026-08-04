'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { AuthDivider } from '@/components/auth/auth-divider'
import { OtpInput } from '@/components/auth/otp-input'
import { OtpResend } from '@/components/auth/otp-resend'
import { PasswordField } from '@/components/auth/password-field'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  DEMO_OTP,
  displayUsername,
  type InvestorAccount,
} from '@/lib/investor-lifecycle'
import {
  loginSchema,
  registerSchema,
  wait,
  type LoginInput,
  type RegisterInput,
} from '@/lib/auth-schemas'
import { isOnboardingComplete } from '@/lib/demo-auth'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'
import type { AuthModalIntent } from '@/providers/auth-modal-provider'
import { cn } from '@/lib/cn'

type Step =
  | 'welcome'
  | 'login'
  | 'register'
  | 'verify'
  | 'twofa'
  | 'account-ready'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.86-.08-1.69-.22-2.48H12v4.7h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.56-5.14 3.56-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.87-3a7.2 7.2 0 0 1-10.72-3.77H1.36v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.34 14.33a7.2 7.2 0 0 1 0-4.6V6.64H1.36a12 12 0 0 0 0 10.78l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.36 6.64l3.98 3.09A7.2 7.2 0 0 1 12 4.75Z"
      />
    </svg>
  )
}

export function AuthModal({
  open,
  intent,
  onOpenChange,
}: {
  open: boolean
  intent: AuthModalIntent
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()
  const lifecycle = useInvestorLifecycle()
  const [step, setStep] = useState<Step>('welcome')
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingAccount, setPendingAccount] = useState<InvestorAccount | null>(null)
  const [otp, setOtp] = useState('')
  const [twoFaCode, setTwoFaCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setOtp('')
    setTwoFaCode('')
    setPendingAccount(null)
    if (intent === 'login') setStep('login')
    else if (intent === 'register') setStep('register')
    else setStep('welcome')
  }, [open, intent])

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: false },
  })

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  function afterAuth(account: InvestorAccount) {
    onOpenChange(false)
    const dest =
      account.kycStatus === 'APPROVED' && isOnboardingComplete()
        ? ROUTES.dashboard.root
        : ROUTES.auth.onboarding
    router.push(dest)
    router.refresh()
  }

  async function handleGoogle() {
    setBusy(true)
    setFormError(null)
    await wait(600)
    try {
      const account = lifecycle.loginWithGoogle()
      toast.success('Signed in with Google')
      setPendingAccount(account)
      setStep('account-ready')
    } finally {
      setBusy(false)
    }
  }

  async function onLogin(values: LoginInput) {
    setBusy(true)
    setFormError(null)
    await wait(500)
    const result = lifecycle.login(values.identifier, values.password)
    setBusy(false)
    if (!result.ok) {
      if (result.account && !result.account.emailVerified) {
        setPendingEmail(result.account.email)
        setStep('verify')
        toast.message('Verify your email to continue.')
        return
      }
      setFormError(result.error ?? 'Sign-in failed')
      return
    }
    if (result.needsOtp && result.account) {
      setPendingAccount(result.account)
      setStep('twofa')
      return
    }
    toast.success('Welcome back')
    if (result.account) afterAuth(result.account)
  }

  async function onRegister(values: RegisterInput) {
    setBusy(true)
    setFormError(null)
    await wait(700)
    try {
      const { account } = lifecycle.registerAccount({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      })
      setPendingEmail(account.email)
      setPendingAccount(account)
      setStep('verify')
      toast.success('Welcome email sent', {
        description: `User ID ${account.userId} · ${displayUsername(account.username)}`,
      })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not create account')
    } finally {
      setBusy(false)
    }
  }

  async function onVerify() {
    setFormError(null)
    if (otp.length !== 6) {
      setFormError('Enter the 6-digit code')
      return
    }
    setBusy(true)
    await wait(500)
    const result = lifecycle.verifyEmail(pendingEmail, otp)
    setBusy(false)
    if (!result.ok) {
      setFormError(result.error ?? 'Invalid code')
      return
    }
    setPendingAccount(result.account ?? null)
    toast.success('Email verified')
    setStep('account-ready')
  }

  async function onTwoFa() {
    if (!pendingAccount) return
    setBusy(true)
    setFormError(null)
    await wait(400)
    const result = lifecycle.completeLogin(pendingAccount.userId, twoFaCode)
    setBusy(false)
    if (!result.ok) {
      setFormError(result.error ?? 'Invalid code')
      return
    }
    toast.success('Signed in')
    afterAuth(result.account!)
  }

  const titles: Record<Step, { title: string; description: string }> = {
    welcome: {
      title: 'Welcome to Growzy',
      description: 'Continue with Google or email to start investing.',
    },
    login: {
      title: 'Sign in',
      description: 'Access your Growzy Capital investor account.',
    },
    register: {
      title: 'Create your account',
      description: 'We will generate a permanent User ID and username for you.',
    },
    verify: {
      title: 'Verify your email',
      description: `Enter the 6-digit code sent to ${pendingEmail || 'your inbox'}. Demo: ${DEMO_OTP}`,
    },
    twofa: {
      title: 'Authenticator code',
      description: 'Enter the code from your authenticator app. Demo: 123456',
    },
    'account-ready': {
      title: 'Welcome to Growzy',
      description: 'Complete identity verification before investing.',
    },
  }

  const meta = titles[step]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-[calc(100vw-1.25rem)] max-w-md p-0 sm:max-w-lg',
          'overflow-hidden border border-white/[0.08]',
        )}
      >
        <div className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-8">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-500/15 to-transparent"
            aria-hidden
          />
          <DialogHeader className="relative mb-5 pr-6">
            <DialogTitle className="text-heading-lg sm:text-heading-xl">{meta.title}</DialogTitle>
            <DialogDescription>{meta.description}</DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative space-y-4"
            >
              {formError ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-caption text-danger" role="alert">
                  {formError}
                </p>
              ) : null}

              {step === 'welcome' ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    size="lg"
                    loading={busy}
                    onClick={() => void handleGoogle()}
                  >
                    <GoogleMark />
                    Continue with Google
                  </Button>
                  <AuthDivider label="OR" />
                  <Button
                    type="button"
                    variant="glass"
                    fullWidth
                    size="lg"
                    onClick={() => setStep('login')}
                  >
                    Continue with Email
                  </Button>
                  <p className="pt-1 text-center text-caption text-fg-subtle">
                    New here?{' '}
                    <button
                      type="button"
                      className="text-accent-300 underline-offset-4 hover:underline"
                      onClick={() => setStep('register')}
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              ) : null}

              {step === 'login' ? (
                <form className="space-y-4" noValidate onSubmit={loginForm.handleSubmit(onLogin)}>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    size="md"
                    loading={busy}
                    onClick={() => void handleGoogle()}
                  >
                    <GoogleMark />
                    Continue with Google
                  </Button>
                  <AuthDivider label="OR" />
                  <FormField label="Email / Username" required error={loginForm.formState.errors.identifier?.message}>
                    <Input
                      autoComplete="username"
                      placeholder="you@example.com"
                      {...loginForm.register('identifier')}
                    />
                  </FormField>
                  <FormField label="Password" required error={loginForm.formState.errors.password?.message}>
                    <PasswordField autoComplete="current-password" {...loginForm.register('password')} />
                  </FormField>
                  <div className="flex items-center justify-between gap-3">
                    <Controller
                      name="rememberMe"
                      control={loginForm.control}
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
                      className="text-caption text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Button type="submit" fullWidth size="lg" loading={busy} loadingText="Signing in…">
                    Login
                  </Button>
                  <p className="text-center text-caption text-fg-subtle">
                    No account?{' '}
                    <button
                      type="button"
                      className="text-accent-300 underline-offset-4 hover:underline"
                      onClick={() => setStep('register')}
                    >
                      Register
                    </button>
                  </p>
                </form>
              ) : null}

              {step === 'register' ? (
                <form className="space-y-3.5" noValidate onSubmit={registerForm.handleSubmit(onRegister)}>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    size="md"
                    loading={busy}
                    onClick={() => void handleGoogle()}
                  >
                    <GoogleMark />
                    Continue with Google
                  </Button>
                  <AuthDivider label="OR" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="First name" required error={registerForm.formState.errors.firstName?.message}>
                      <Input autoComplete="given-name" {...registerForm.register('firstName')} />
                    </FormField>
                    <FormField label="Last name" required error={registerForm.formState.errors.lastName?.message}>
                      <Input autoComplete="family-name" {...registerForm.register('lastName')} />
                    </FormField>
                  </div>
                  <FormField label="Email" required error={registerForm.formState.errors.email?.message}>
                    <Input type="email" autoComplete="email" {...registerForm.register('email')} />
                  </FormField>
                  <FormField label="Phone" required error={registerForm.formState.errors.phone?.message}>
                    <Input type="tel" autoComplete="tel" placeholder="+92 300 1234567" {...registerForm.register('phone')} />
                  </FormField>
                  <FormField label="Password" required error={registerForm.formState.errors.password?.message}>
                    <PasswordField autoComplete="new-password" showStrength {...registerForm.register('password')} />
                  </FormField>
                  <FormField label="Confirm password" required error={registerForm.formState.errors.confirmPassword?.message}>
                    <PasswordField autoComplete="new-password" {...registerForm.register('confirmPassword')} />
                  </FormField>
                  <Controller
                    name="acceptTerms"
                    control={registerForm.control}
                    render={({ field, fieldState }) => (
                      <div className="space-y-1">
                        <CheckboxField
                          checked={field.value === true}
                          onCheckedChange={(v) => field.onChange(v === true)}
                          label={
                            <>
                              I accept the{' '}
                              <Link href={ROUTES.marketing.legal.terms} className="text-accent-300 underline-offset-4 hover:underline">
                                terms
                              </Link>{' '}
                              and{' '}
                              <Link href={ROUTES.marketing.legal.privacy} className="text-accent-300 underline-offset-4 hover:underline">
                                privacy policy
                              </Link>
                            </>
                          }
                        />
                        {fieldState.error ? (
                          <p className="text-caption text-danger">{fieldState.error.message}</p>
                        ) : null}
                      </div>
                    )}
                  />
                  <Button type="submit" fullWidth size="lg" loading={busy} loadingText="Creating…">
                    Create account
                  </Button>
                  <p className="text-center text-caption text-fg-subtle">
                    Already investing?{' '}
                    <button
                      type="button"
                      className="text-accent-300 underline-offset-4 hover:underline"
                      onClick={() => setStep('login')}
                    >
                      Login
                    </button>
                  </p>
                </form>
              ) : null}

              {step === 'verify' ? (
                <div className="space-y-4">
                  <OtpInput value={otp} onChange={setOtp} autoFocus error={Boolean(formError)} />
                  <OtpResend
                    onResend={async () => {
                      await wait(300)
                      lifecycle.queueEmail('VERIFY_EMAIL', pendingEmail)
                      toast.success('OTP resent', { description: `Code: ${DEMO_OTP}` })
                    }}
                  />
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    loading={busy}
                    disabled={otp.length !== 6}
                    onClick={() => void onVerify()}
                  >
                    Verify email
                  </Button>
                </div>
              ) : null}

              {step === 'twofa' ? (
                <div className="space-y-4">
                  <OtpInput value={twoFaCode} onChange={setTwoFaCode} autoFocus error={Boolean(formError)} />
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    loading={busy}
                    disabled={twoFaCode.length !== 6}
                    onClick={() => void onTwoFa()}
                  >
                    Continue
                  </Button>
                </div>
              ) : null}

              {step === 'account-ready' && pendingAccount ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-caption text-fg-subtle">Your permanent credentials</p>
                    <dl className="mt-3 space-y-2 text-body-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-fg-muted">User ID</dt>
                        <dd className="font-mono text-fg">{pendingAccount.userId}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-fg-muted">Username</dt>
                        <dd className="font-mono text-fg">{displayUsername(pendingAccount.username)}</dd>
                      </div>
                    </dl>
                  </div>
                  <p className="text-body-sm text-fg-muted">
                    Complete identity verification before you can deposit or withdraw.
                  </p>
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    onClick={() => {
                      onOpenChange(false)
                      router.push(ROUTES.auth.onboarding)
                    }}
                  >
                    Continue
                  </Button>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
