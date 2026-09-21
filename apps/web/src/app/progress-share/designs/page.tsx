import type { Metadata } from 'next'

import { ProgressShareDesignsClient } from './designs-client'

export const metadata: Metadata = {
  title: 'Progress share design review',
  robots: { index: false, follow: false },
}

/** Temporary visual review. Does not replace /progress-share or the API PNG renderer. */
export default function ProgressShareDesignsPage() {
  return <ProgressShareDesignsClient />
}
