import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'

import { LegalDocument } from '@/components/marketing/legal-document'

export const metadata: Metadata = {
  title: 'Refund policy',
  alternates: { canonical: ROUTES.marketing.legal.refundPolicy },
}

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      title="Refund policy"
      intro="When a deposit can be returned, how a withdrawal differs from a refund and what happens to a payment that cannot be matched."
      sections={[
        { heading: 'Refund versus withdrawal', summary: 'A withdrawal is a payout of your balance; a refund reverses a deposit that should not have been credited.' },
        { heading: 'Uncredited and rejected deposits', summary: 'How funds are returned when proof cannot be matched, including the destination and the timeframe.' },
        { heading: 'Cooling-off', summary: 'Whether an untraded deposit can be returned in full, and the window for requesting it.' },
        { heading: 'Deposits already exposed to trading', summary: 'Why a balance that has been through a settlement run is returned at its current value, not its original amount.' },
        { heading: 'Duplicate and erroneous payments', summary: 'The process for returning an accidental or repeated transfer.' },
        { heading: 'Fees and charges on return', summary: 'Any transfer cost deducted from a returned payment and who bears it.' },
        { heading: 'How to request', summary: 'Where to raise the request and what information is needed to process it.' },
      ]}
    />
  )
}
