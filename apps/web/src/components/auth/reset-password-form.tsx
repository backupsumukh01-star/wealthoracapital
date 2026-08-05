'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { AuthCard } from '@/components/auth/auth-card'
import { PasswordField } from '@/components/auth/password-field'
import { SuccessState } from '@/components/auth/success-state'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { useResetPassword } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-client'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/auth-schemas'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const resetPassword = useResetPassword()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return
    await resetPassword.mutateAsync({ token, password: values.password }).catch(() => undefined)
  }

  if (!token) {
    return (
      <AuthCard
        title="Link expired"
        description="This reset link is no longer valid. Request a new one — links expire after one hour."
        footer={
          <Link
            href={ROUTES.auth.forgotPassword}
            className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            Request a new reset link
          </Link>
        }
      >
        <Alert tone="warning" title="Missing token">
          Open the reset link from your email to continue.
        </Alert>
      </AuthCard>
    )
  }

  if (resetPassword.isSuccess) {
    return (
      <SuccessState
        title="Password updated"
        description="Your password has been changed. Sign in with your new password."
        primaryAction={{ label: 'Go to login', href: `${ROUTES.auth.login}?reset=1` }}
      />
    )
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Use at least 10 characters with upper and lower case letters and a number."
      footer={
        <Link
          href={ROUTES.auth.login}
          className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          Back to login
        </Link>
      }
    >
      {resetPassword.isError ? (
        <Alert tone="danger" title="Could not reset password">
          {resetPassword.error instanceof ApiError
            ? resetPassword.error.message
            : 'This link may have expired. Request a new one.'}
        </Alert>
      ) : null}

      <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormField label="New password" required error={errors.password?.message}>
          <PasswordField autoComplete="new-password" showStrength {...register('password')} />
        </FormField>

        <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
          <PasswordField autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isSubmitting || resetPassword.isPending}
          loadingText="Updating…"
        >
          Update password
        </Button>
      </form>
    </AuthCard>
  )
}
