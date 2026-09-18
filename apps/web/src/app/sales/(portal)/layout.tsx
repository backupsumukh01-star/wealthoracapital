import type { ReactNode } from 'react'

import { SalesPortalShell } from '@/components/sales/sales-portal-shell'
import { SalesSessionGate } from '@/components/sales/sales-session-gate'

export default function SalesPortalLayout({ children }: { children: ReactNode }) {
  return (
    <SalesSessionGate>
      <SalesPortalShell>{children}</SalesPortalShell>
    </SalesSessionGate>
  )
}
