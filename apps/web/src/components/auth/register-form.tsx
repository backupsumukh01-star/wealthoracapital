'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_ROUTES, ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { PasswordField } from '@/components/auth/password-field'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useRegister } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-client'
import {
  normalizeReferralRefParam,
  registerSchema,
  type RegisterInput,
} from '@/lib/auth-schemas'
import { env } from '@/lib/env'

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registerMutation = useRegister()
  const refFromQuery = normalizeReferralRefParam(searchParams.get('ref'))
  const oauthError = searchParams.get('oauth')

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      referralCode: refFromQuery,
      acceptTerms: false,
    },
  })

  // Keep the Referral Code field in sync when landing via /register?ref=CODE
  useEffect(() => {
    if (refFromQuery) {
      setValue('referralCode', refFromQuery, { shouldDirty: false, shouldValidate: true })
    }
  }, [refFromQuery, setValue])

  const referralCodeValue = watch('referralCode')

  function handleGoogle() {
    const redirectTo = `${env.NEXT_PUBLIC_SITE_URL}${ROUTES.auth.oauthCallback}`
    const params = new URLSearchParams({
      redirect: redirectTo,
    })
    const code = normalizeReferralRefParam(
      typeof referralCodeValue === 'string' ? referralCodeValue : refFromQuery,
    )
    if (code) params.set('ref', code)
    window.location.href = `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.auth.google}?${params.toString()}`
  }

  async function onSubmit(values: RegisterInput) {
    try {
      const result = await registerMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        password: values.password,
        ...(values.referralCode ? { referralCode: values.referralCode } : {}),
        acceptTerms: true,
        acceptRisk: true,
      })
      toast.success('Account created', {
        description:
          result.emailSent === false
            ? 'We could not send the verification email yet. Use Resend on the next screen.'
            : 'Check your email to verify your address, then sign in.',
      })
      router.push(
        `${ROUTES.auth.verifyEmail}?email=${encodeURIComponent(values.email.trim().toLowerCase())}&from=register`,
      )
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not create account'
      toast.error(message)
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Open a Growzy investor account. We assign a permanent User ID and username automatically."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href={ROUTES.auth.login}
            className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            Login
          </Link>
        </>
      }
    >
      {oauthError === 'invalid_referral' ? (
        <Alert tone="danger" title="Invalid referral code." className="mb-5">
          The referral code could not be applied. Edit or clear the Referral Code field, then try
          again with email or Google.
        </Alert>
      ) : null}

      <SocialLoginButtons googleLabel="Continue with Google" onGoogle={handleGoogle} />

      <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" required error={errors.firstName?.message}>
            <Input autoComplete="given-name" {...register('firstName')} />
          </FormField>
          <FormField label="Last name" required error={errors.lastName?.message}>
            <Input autoComplete="family-name" {...register('lastName')} />
          </FormField>
        </div>

        <FormField label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </FormField>

        <FormField label="Mobile number" required error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" {...register('phone')} />
        </FormField>

        <FormField label="Password" required error={errors.password?.message}>
          <PasswordField autoComplete="new-password" showStrength {...register('password')} />
        </FormField>

        <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
          <PasswordField autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>

        <FormField
          label="Referral code / Promo code"
          hint="Optional. Pre-filled from your invite link — you can keep, edit, or clear it."
          error={errors.referralCode?.message}
        >
          <Input
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Optional"
            className="uppercase tracking-wide"
            {...register('referralCode')}
          />
        </FormField>

        <Controller
          name="acceptTerms"
          control={control}
          render={({ field, fieldState }) => {
            const errorId = 'accept-terms-error'
            return (
              <div className="space-y-1.5">
                <CheckboxField
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={fieldState.error ? true : undefined}
                  aria-describedby={fieldState.error ? errorId : undefined}
                  label={
                    <>
                      I accept the{' '}
                      <Link
                        href={ROUTES.marketing.legal.terms}
                        className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        terms
                      </Link>
                      ,{' '}
                      <Link
                        href={ROUTES.marketing.legal.privacy}
                        className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        privacy policy
                      </Link>{' '}
                      and{' '}
                      <Link
                        href={ROUTES.marketing.legal.riskDisclosure}
                        className="rounded-sm text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        risk disclosure
                      </Link>
                    </>
                  }
                />
                {fieldState.error ? (
                  <p id={errorId} className="text-caption text-danger" role="alert">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </div>
            )
          }}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isSubmitting || registerMutation.isPending}
          loadingText="Creating account…"
        >
          Create Account
        </Button>
      </form>
    </AuthCard>
  )
}
