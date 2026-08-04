'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { Suspense } from 'react'

import { AuthCard } from '@/components/auth/auth-card'
import { Spinner } from '@/components/ui/spinner'
import { setDemoSession, markOnboardingComplete } from '@/lib/demo-auth'

function OAuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    const t = setTimeout(() => {
      if (error) {
        router.replace(`${ROUTES.auth.login}?oauth=failed`)
        return
      }
      setDemoSession()
      markOnboardingComplete()
      router.replace(ROUTES.dashboard.root)
    }, 1400)
    return () => clearTimeout(t)
  }, [error, router])

  return (
    <AuthCard
      title={error ? 'Sign-in failed' : 'Finishing sign-in'}
      description={
        error
          ? 'Google sign-in could not be completed. You will return to login shortly.'
          : 'Completing sign-in…'
      }
    >
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    </AuthCard>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  )
}
