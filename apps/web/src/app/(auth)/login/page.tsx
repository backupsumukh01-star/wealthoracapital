import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoginForm } from '@/components/auth/login-form'
import { Spinner } from '@/components/ui/spinner'

export const metadata: Metadata = { title: 'Login', robots: { index: false } }

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
