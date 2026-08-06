import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AdminLoginForm } from '@/components/admin/admin-login-form'

export const metadata: Metadata = {
  title: 'Admin login',
  robots: { index: false },
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  )
}
