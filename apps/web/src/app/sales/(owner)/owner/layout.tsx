import type { ReactNode } from 'react'

import { AdminSessionGate } from '@/components/admin/admin-topbar'
import { SalesOwnerShell } from '@/components/sales/sales-owner-shell'

export default function SalesOwnerLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionGate>
      <SalesOwnerShell>{children}</SalesOwnerShell>
    </AdminSessionGate>
  )
}
