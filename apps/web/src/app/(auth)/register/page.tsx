import type { Metadata } from 'next'
import { Suspense } from 'react'

import { RegisterForm } from '@/components/auth/register-form'
import { AuthCard } from '@/components/auth/auth-card'

export const metadata: Metadata = { title: 'Register', robots: { index: false } }

function RegisterFallback() {
  return (
    <AuthCard title="Create your account" description="Loading registration form…">
      <div className="h-40 animate-pulse rounded-xl bg-inset/60" aria-hidden />
    </AuthCard>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  )
}
