import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { SalesLoginForm } from '@/components/sales/sales-login-form'
import { Spinner } from '@/components/ui/spinner'

export const metadata: Metadata = {
  title: 'Sales login',
  robots: { index: false, follow: false },
}

export default function SalesLoginPage() {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        }
      >
        <SalesLoginForm />
      </Suspense>
    </AuthLayout>
  )
}
