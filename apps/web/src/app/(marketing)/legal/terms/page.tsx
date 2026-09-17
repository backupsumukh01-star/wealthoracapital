import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'

import { LegalDocument } from '@/components/marketing/legal-document'
import { CmsPageBody } from '@/components/marketing/cms-page-body'

export const metadata: Metadata = {
  title: 'Terms of service',
  alternates: { canonical: ROUTES.marketing.legal.terms },
}

export default function TermsPage() {
  return (
    <>
      <LegalDocument
        title="Terms of service"
        intro="The agreement between you and Wealthora Capital Partners, covering eligibility, the nature of the programme, and how the relationship can end."
        sections={[
          { heading: 'Eligibility and account registration', summary: 'Who may open an account, the one-account rule, and the information required.' },
          { heading: 'Nature of the service', summary: 'What the managed programme is, and explicitly what it is not — no guaranteed return and no principal protection.' },
          { heading: 'Deposits', summary: 'Accepted methods, review and crediting, and the treatment of unmatched or third-party payments.' },
          { heading: 'Daily return application', summary: 'How the daily figure is set, which balances are eligible, and that negative days apply on the same terms.' },
          { heading: 'Withdrawals', summary: 'Request, review and payout, together with limits and the destinations funds may be sent to.' },
          { heading: 'Fees', summary: 'Every charge that can apply and the point at which it is disclosed.' },
          { heading: 'Suspension and termination', summary: 'Grounds for suspending an account, notice, and the return of any remaining balance.' },
          { heading: 'Liability', summary: 'The limits of the platform’s liability and the risks that remain with the investor.' },
          { heading: 'Dispute resolution', summary: 'Governing law, jurisdiction, and the complaints process.' },
          { heading: 'Changes to these terms', summary: 'How amendments are notified and when they take effect.' },
        ]}
      />
      <CmsPageBody slug="terms" />
    </>
  )
}
