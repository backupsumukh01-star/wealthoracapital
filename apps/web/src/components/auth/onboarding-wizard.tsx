'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, FileUp, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { AuthCard } from '@/components/auth/auth-card'
import { SuccessDialog } from '@/components/auth/success-dialog'
import { KycUploadSlot } from '@/components/auth/kyc-upload-slot'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  kycStatusBadge,
  useKycStatus,
  useSubmitKyc,
  useUpdateKyc,
  useUploadKycDocument,
} from '@/features/kyc/hooks'
import { ApiError } from '@/lib/api-client'
import {
  COUNTRIES,
  onboardingKycSchema,
  type OnboardingKycInput,
} from '@/lib/auth-schemas'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

const STEPS = [
  { id: 2, label: 'Identity' },
  { id: 3, label: 'Documents' },
  { id: 4, label: 'Review' },
] as const

const ID_TYPES = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving license' },
  { value: 'NATIONAL_ID', label: 'National ID' },
] as const

/**
 * Investor onboarding + KYC — production API (`/kyc/update`, `/kyc/upload`, `/kyc/submit`).
 */
export function OnboardingWizard() {
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()
  const { session, isLoading: sessionLoading, isAuthenticated, refresh } = useSession()
  const kycStatusQuery = useKycStatus(isAuthenticated)
  const updateKyc = useUpdateKyc()
  const uploadDoc = useUploadKycDocument()
  const submitKyc = useSubmitKyc()

  const [step, setStep] = useState(2)
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const kycStatus =
    kycStatusQuery.data?.status ?? session?.user.kycStatus ?? 'NOT_STARTED'
  const infoRequestMessage =
    kycStatusQuery.data?.infoRequestMessage ?? kycStatusQuery.data?.rejectionReason ?? null
  const existingDocs = kycStatusQuery.data?.documents ?? []
  const hasExistingFront = existingDocs.some(
    (d) => d.side === 'FRONT' || (d.kind !== 'SELFIE' && !d.side),
  )
  const hasExistingBack = existingDocs.some((d) => d.side === 'BACK')
  const hasExistingSelfie = existingDocs.some(
    (d) => d.kind === 'SELFIE' || d.side === 'SINGLE',
  )
  const needsResubmit = kycStatus === 'NEED_MORE_INFO' || kycStatus === 'REJECTED'

  const form = useForm<OnboardingKycInput>({
    resolver: zodResolver(onboardingKycSchema),
    defaultValues: {
      country: session?.user.country ?? 'US',
      dateOfBirth: '',
      address: '',
      city: '',
      occupation: '',
      idType: 'PASSPORT',
    },
  })

  // Session may load after first mount — apply saved country without overwriting empty → US default.
  useEffect(() => {
    const saved = session?.user.country
    if (!saved) return
    form.setValue('country', saved)
  }, [session?.user.country, form])

  useEffect(() => {
    if (sessionLoading) return
    if (!isAuthenticated) {
      router.replace(`${ROUTES.auth.login}?next=${encodeURIComponent(ROUTES.auth.onboarding)}`)
    }
  }, [sessionLoading, isAuthenticated, router])

  const progress = useMemo(() => {
    const index = STEPS.findIndex((item) => item.id === step)
    return ((Math.max(index, 0) + 1) / STEPS.length) * 100
  }, [step])
  const badge = kycStatusBadge(kycStatus)

  async function onContinueIdentity(values: OnboardingKycInput) {
    setSubmitError(null)
    setSavingProfile(true)
    try {
      await updateKyc.mutateAsync({
        country: values.country,
        dateOfBirth: values.dateOfBirth,
        nationality: values.country,
        addressLine1: values.address,
        city: values.city,
        occupation: values.occupation,
        primaryDocumentType: values.idType,
      })
      setStep(3)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not save identity details',
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function onSubmitDocs(values: OnboardingKycInput) {
    setSubmitError(null)
    const frontOk = Boolean(front) || (needsResubmit && hasExistingFront)
    const selfieOk = Boolean(selfie) || (needsResubmit && hasExistingSelfie)
    const backOk =
      values.idType === 'PASSPORT' || Boolean(back) || (needsResubmit && hasExistingBack)

    if (!frontOk || !selfieOk) {
      setSubmitError('Upload ID front and a selfie to continue.')
      return
    }
    if (!backOk) {
      setSubmitError('Upload the back of your ID.')
      return
    }

    setSubmitting(true)
    try {
      // Ensure draft exists / is current before uploads (API requires profile first).
      await updateKyc.mutateAsync({
        country: values.country,
        dateOfBirth: values.dateOfBirth,
        nationality: values.country,
        addressLine1: values.address,
        city: values.city,
        occupation: values.occupation,
        primaryDocumentType: values.idType,
      })

      if (front) {
        await uploadDoc.mutateAsync({
          kind: values.idType,
          file: front,
          side: 'FRONT',
        })
      }
      if (values.idType !== 'PASSPORT' && back) {
        await uploadDoc.mutateAsync({
          kind: values.idType,
          file: back,
          side: 'BACK',
        })
      }
      if (selfie) {
        await uploadDoc.mutateAsync({
          kind: 'SELFIE',
          file: selfie,
          side: 'SINGLE',
        })
      }

      await submitKyc.mutateAsync({})
      refresh()
      toast.success('KYC submitted', { description: 'Expected review: 24–48 hours.' })
      setStep(4)
      setSuccessOpen(true)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not submit KYC',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionLoading || (isAuthenticated && kycStatusQuery.isLoading)) {
    return (
      <AuthCard title="Identity verification" description="Loading your account…">
        <p className="text-body-sm text-fg-muted">Please wait.</p>
      </AuthCard>
    )
  }

  if (!session) {
    return (
      <AuthCard title="Sign in required" description="Verify your identity after signing in.">
        <Button fullWidth size="lg" onClick={() => router.push(ROUTES.auth.login)}>
          Sign in
        </Button>
      </AuthCard>
    )
  }

  if (kycStatus === 'UNDER_REVIEW' || kycStatus === 'SUBMITTED') {
    return (
      <AuthCard
        title="KYC under review"
        description="Your KYC is currently under review."
      >
        <Alert tone="warning" title="Deposit locked">
          You cannot deposit or withdraw until KYC is approved. Expected review: 24–48 hours.
        </Alert>
        <Button fullWidth size="lg" onClick={() => router.push(ROUTES.dashboard.root)}>
          Go to dashboard
        </Button>
      </AuthCard>
    )
  }

  if (kycStatus === 'APPROVED') {
    return (
      <AuthCard title="You are verified" description="Your account is ready to deposit and invest.">
        <Button fullWidth size="lg" onClick={() => router.push(ROUTES.dashboard.wallet)}>
          Deposit funds
        </Button>
      </AuthCard>
    )
  }

  return (
    <>
      <AuthCard
        title="Identity verification"
        description="Cannot deposit until KYC is approved."
        className="sm:max-w-none"
      >
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-caption">
          <span className="truncate text-fg">
            {session.user.firstName} {session.user.lastName}
          </span>
          <span className="text-fg-subtle">·</span>
          <span className="truncate font-mono text-fg">{session.user.email}</span>
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium',
              badge.tone === 'profit' && 'bg-profit/15 text-profit',
              badge.tone === 'warning' && 'bg-warning/15 text-warning',
              badge.tone === 'info' && 'bg-info/15 text-info',
              badge.tone === 'loss' && 'bg-loss/15 text-loss',
              badge.tone === 'neutral' && 'bg-hover text-fg-muted',
            )}
          >
            {badge.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ol className="flex gap-1.5" aria-label="Onboarding progress">
            {STEPS.map((s) => {
              const done = step > s.id
              const current = step === s.id
              return (
                <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      'truncate text-[10px] font-medium sm:text-caption',
                      current ? 'text-accent-200' : done ? 'text-fg-muted' : 'text-fg-subtle',
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {needsResubmit ? (
          <Alert tone="warning" title={kycStatus === 'REJECTED' ? 'KYC rejected' : 'More information needed'}>
            {infoRequestMessage?.trim() ||
              'Please update your documents and submit again for review.'}
          </Alert>
        ) : null}

        {submitError && step !== 3 ? (
          <Alert tone="danger" title="Could not continue">
            {submitError}
          </Alert>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, x: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 2 ? (
              <form
                className="space-y-4"
                noValidate
                onSubmit={form.handleSubmit(onContinueIdentity)}
              >
                <p className="text-body-sm font-medium text-fg">Personal details</p>
                <FormField label="Country" required error={form.formState.errors.country?.message}>
                  <Controller
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Date of birth" required error={form.formState.errors.dateOfBirth?.message}>
                  <Input type="date" {...form.register('dateOfBirth')} />
                </FormField>
                <FormField label="Address" required error={form.formState.errors.address?.message}>
                  <Input {...form.register('address')} placeholder="Street, building, area" />
                </FormField>
                <FormField label="City" required error={form.formState.errors.city?.message}>
                  <Input {...form.register('city')} />
                </FormField>
                <FormField label="Occupation" required error={form.formState.errors.occupation?.message}>
                  <Input {...form.register('occupation')} placeholder="Investor, engineer…" />
                </FormField>
                <FormField label="Government ID type" required error={form.formState.errors.idType?.message}>
                  <Controller
                    control={form.control}
                    name="idType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ID_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={savingProfile}
                    loadingText="Saving…"
                  >
                    Continue to documents
                  </Button>
                </div>
              </form>
            ) : null}

            {step === 3 ? (
              <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmitDocs)}>
                <p className="text-body-sm font-medium text-fg">Upload documents</p>
                <p className="text-caption text-fg-subtle">
                  Drag & drop, browse, or use camera. Files upload securely to Wealthora for review.
                </p>
                {submitError ? (
                  <Alert tone="danger" title="Cannot submit">
                    {submitError}
                  </Alert>
                ) : null}
                <KycUploadSlot
                  label="ID front"
                  icon={FileUp}
                  file={front}
                  onChange={setFront}
                  required
                />
                {form.watch('idType') !== 'PASSPORT' ? (
                  <KycUploadSlot
                    label="ID back"
                    icon={FileUp}
                    file={back}
                    onChange={setBack}
                    required
                  />
                ) : null}
                <KycUploadSlot
                  label="Selfie"
                  icon={Camera}
                  file={selfie}
                  onChange={setSelfie}
                  required
                  capture
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="ghost" className="sm:flex-1" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="sm:flex-[2]"
                    size="lg"
                    loading={submitting}
                    loadingText="Submitting…"
                  >
                    Submit KYC
                  </Button>
                </div>
              </form>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-warning/15 text-warning">
                  <ShieldCheck className="size-7" aria-hidden />
                </div>
                <p className="text-heading-md text-fg">Under review</p>
                <p className="text-body-sm text-fg-muted">
                  Status is Under Review. You cannot deposit until approved.
                </p>
                <Button fullWidth size="lg" onClick={() => router.push(ROUTES.dashboard.root)}>
                  Open dashboard
                </Button>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </AuthCard>

      <SuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        title="KYC submitted"
        description="Our compliance team is reviewing your documents. Expected review: 24–48 hours."
        primaryLabel="Go to dashboard"
        onPrimary={() => router.push(ROUTES.dashboard.root)}
      />
    </>
  )
}
