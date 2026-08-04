import type { ReactNode } from 'react'

import { MarketingShell } from '@/components/marketing/marketing-shell'

/**
 * The public shell. Server-rendered by default — these pages are SEO-critical and must not
 * depend on client-side data fetching to produce their content (docs/02 §Rendering).
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>
}
