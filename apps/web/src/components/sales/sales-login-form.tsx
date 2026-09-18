'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { PasswordField } from '@/components/auth/password-field'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { salesLoginErrorMessage } from '@/features/sales/auth-errors'
import { useSalesLogin } from '@/features/sales/hooks'
import { salesLoginSchema, type SalesLoginInput } from '@/features/sales/sales-login-schema'

function safeSalesNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return ROUTES.sales.dashboard
  if (raw.startsWith(ROUTES.sales.owner.root)) return ROUTES.sales.dashboard
  if (!raw.startsWith(ROUTES.sales.root)) return ROUTES.sales.dashboard
  if (raw === ROUTES.sales.login) return ROUTES.sales.dashboard
  return raw
}

export function SalesLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useSalesLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SalesLoginInput>({
    resolver: zodResolver(salesLoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const disabledBanner = searchParams.get('disabled') === '1'

  async function onSubmit(values: SalesLoginInput) {
    setFormError(null)
    try {
      await login.mutateAsync({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      toast.success('Signed in to Sales Portal')
      router.push(safeSalesNext(searchParams.get('next')))
      router.refresh()
    } catch (error) {
      setFormError(salesLoginErrorMessage(error))
    }
  }

  const busy = isSubmitting || login.isPending

  return (
    <AuthCard
      title="Sales Portal"
      description="Sign in with your salesman email. This is separate from investor and admin accounts."
    >
      {disabledBanner ? (
        <Alert tone="danger" title="Account disabled">
          This sales account has been disabled. Contact your administrator.
        </Alert>
      ) : null}
      {formError ? (
        <Alert tone="danger" title="Could not sign in">
          {formError}
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Email" error={errors.email?.message} required>
          <Input
            type="email"
            autoComplete="username"
            inputMode="email"
            disabled={busy}
            {...register('email')}
          />
        </FormField>
        <FormField label="Password" error={errors.password?.message} required>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordField
                autoComplete="current-password"
                disabled={busy}
                invalid={Boolean(errors.password)}
                {...field}
              />
            )}
          />
        </FormField>
        <Button type="submit" fullWidth loading={busy} loadingText="Signing in…">
          Sign in
        </Button>
      </form>
    </AuthCard>
  )
}
