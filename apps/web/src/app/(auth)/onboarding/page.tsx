import type { Metadata } from 'next'

import { OnboardingWizard } from '@/components/auth/onboarding-wizard'
import { ProtectedRoute } from '@/components/auth/protected-route'

export const metadata: Metadata = { title: 'Onboarding', robots: { index: false } }

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingWizard />
    </ProtectedRoute>
  )
}
