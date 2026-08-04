import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoadingScreen } from '@/components/auth/loading-screen'
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel'

export const metadata: Metadata = { title: 'Verify email', robots: { index: false } }

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading verification…" compact />}>
      <VerifyEmailPanel />
    </Suspense>
  )
}
