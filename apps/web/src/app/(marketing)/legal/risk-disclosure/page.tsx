import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'

import { RiskDisclosure } from '@/components/common/risk-disclosure'
import { LegalDocument } from '@/components/marketing/legal-document'

export const metadata: Metadata = {
  title: 'Risk disclosure',
  alternates: { canonical: ROUTES.marketing.legal.riskDisclosure },
}

export default function RiskDisclosurePage() {
  return (
    <LegalDocument
      title="Risk disclosure"
      intro="The risks of participating in a managed Forex programme, stated plainly and without qualification."
      sections={[
        { heading: 'Capital at risk', summary: 'Funds committed to the programme can fall in value, and losses may be substantial.' },
        { heading: 'No guaranteed return', summary: 'No return figure is promised, implied, or underwritten, on any timeframe.' },
        { heading: 'Leverage', summary: 'How leveraged positions amplify both gains and losses in the underlying trading.' },
        { heading: 'Market and liquidity risk', summary: 'Gapping, weekend risk, and periods where positions cannot be exited at the expected price.' },
        { heading: 'Concentration', summary: 'The consequences of the desk trading a limited set of currency pairs.' },
        { heading: 'Operational and counterparty risk', summary: 'Broker failure, technology outage, and the platform’s own operational dependencies.' },
        { heading: 'Past performance', summary: 'Why the published track record does not predict future results.' },
        { heading: 'Suitability', summary: 'The programme is not appropriate for funds you cannot afford to lose, including emergency savings.' },
      ]}
    >
      <RiskDisclosure />
    </LegalDocument>
  )
}
