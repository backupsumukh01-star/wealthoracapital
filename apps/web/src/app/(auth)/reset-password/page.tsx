import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { Spinner } from '@/components/ui/spinner'

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } }

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
