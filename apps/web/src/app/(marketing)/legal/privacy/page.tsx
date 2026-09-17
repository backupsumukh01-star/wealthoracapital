import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'

import { LegalDocument } from '@/components/marketing/legal-document'
import { CmsPageBody } from '@/components/marketing/cms-page-body'

export const metadata: Metadata = {
  title: 'Privacy policy',
  alternates: { canonical: ROUTES.marketing.legal.privacy },
}

export default function PrivacyPage() {
  return (
    <>
      <LegalDocument
        title="Privacy policy"
        intro="What personal data Wealthora Capital Partners holds, why it holds it, who can see it, and how long it is kept."
        sections={[
          { heading: 'Data we collect', summary: 'Account details, payment proof documents, device and session metadata, and support correspondence.' },
          { heading: 'Why we collect it', summary: 'The lawful basis for each category, including the compliance obligations behind identity checks.' },
          { heading: 'Payment proof handling', summary: 'How uploaded documents are stored, who may view them, and when they are deleted.' },
          { heading: 'Who has access', summary: 'The operator roles that can view account data, and the audit record kept of every access.' },
          { heading: 'Processors and third parties', summary: 'Hosting, email delivery and error reporting providers, and the data each receives.' },
          { heading: 'Retention', summary: 'How long each category is kept, and why ledger records outlive an account closure.' },
          { heading: 'Your rights', summary: 'Access, correction, export and erasure, and the limits imposed by financial record-keeping duties.' },
          { heading: 'Cookies and sessions', summary: 'The strictly necessary cookies used for authentication and the absence of advertising trackers.' },
          { heading: 'Security', summary: 'Password hashing, transport encryption, session rotation, and breach notification.' },
          { heading: 'Contacting us', summary: 'How to raise a privacy question or complaint.' },
        ]}
      />
      <CmsPageBody slug="privacy" />
    </>
  )
}
