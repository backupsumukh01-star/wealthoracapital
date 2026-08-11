import { Suspense } from 'react'
import type { Metadata } from 'next'

import ProgressSharePage from './progress-share-client'

export const metadata: Metadata = {
  title: 'Share My Progress',
  robots: { index: false, follow: false },
}

export default function ProgressShareRoute() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh bg-[#07131C] px-4 py-10 text-[#F4F8FB]">
          <div className="mx-auto max-w-lg">
            <div className="aspect-square animate-pulse rounded-2xl bg-white/5" />
          </div>
        </main>
      }
    >
      <ProgressSharePage />
    </Suspense>
  )
}
