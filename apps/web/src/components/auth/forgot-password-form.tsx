'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { SuccessState } from '@/components/auth/success-state'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useForgotPassword } from '@/features/auth/hooks'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/auth-schemas'

/**
 * Forgot password: email → API sends a reset link → `/reset-password?token=…` completes it.
 */
export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword()

  const emailForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function submitEmail(values: ForgotPasswordInput) {
    // Enumeration-safe on the API side — it returns success whether or not the email exists.
    await forgotPassword.mutateAsync({ email: values.email.trim().toLowerCase() })
  }

  if (forgotPassword.isSuccess) {
    return (
      <SuccessState
        title="Check your inbox"
        description="If an account exists for that email, we sent a link to set or reset your password. The link expires in 1 hour."
        primaryAction={{
          label: 'Back to login',
          href: ROUTES.auth.login,
        }}
      />
    )
  }

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your email. We will send a link so you can set or reset your password anytime — including Google accounts."
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
      <form
        className="space-y-5"
        noValidate
        onSubmit={emailForm.handleSubmit((values) => {
          void submitEmail(values).catch(() => toast.error('Could not send the reset link'))
        })}
      >
        <FormField label="Email" required error={emailForm.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...emailForm.register('email')} />
        </FormField>
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={forgotPassword.isPending}
          loadingText="Sending…"
        >
          Send reset link
        </Button>
      </form>
    </AuthCard>
  )
}
