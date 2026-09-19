import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'

import { Section } from '@/components/common/section'
import { CtaBand } from '@/components/marketing/cta-band'
import { CORE_FAQS, FaqAccordion, type FaqEntry } from '@/components/marketing/faq-accordion'
import { PageHero } from '@/components/marketing/page-hero'

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description:
    'Deposits, withdrawals, how the daily return is calculated, what happens on a losing day and how your account is secured.',
  alternates: { canonical: ROUTES.marketing.faq },
}

const ACCOUNT_FAQS: FaqEntry[] = [
  {
    question: 'How do I secure my account?',
    answer:
      'Use a unique password. Passwords are stored with Argon2id and never in a recoverable form. Sessions are refreshed on a rotating token, and you can review and revoke active sessions from your security settings.',
  },
  {
    question: 'Can I have more than one account?',
    answer:
      'One account per person. Duplicate accounts are consolidated because the daily return applies per balance and multiple accounts would distort both your figures and everyone else’s.',
  },
  {
    question: 'What happens if I forget my password?',
    answer:
      'Request a reset link from the sign-in screen. The link is single-use and short-lived, and using it signs out every other session on your account.',
  },
]

const MONEY_FAQS: FaqEntry[] = [
  {
    question: 'Which payment methods can I use?',
    answer:
      'The methods currently accepted are listed on the deposit screen with the exact details for each. Send only from an account in your own name so the operator can match the payment to you.',
  },
  {
    question: 'Why does my deposit need manual review?',
    answer:
      'Because an automated credit on an unmatched payment is how funds get lost. An operator matches your proof against the received payment before crediting your wallet, and the decision is recorded.',
  },
  {
    question: 'Are there fees?',
    answer:
      'Any fee that applies is displayed before you confirm, on the same screen, in the same currency. There are no fees disclosed only after the fact.',
  },
]

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered without hedging"
        description="If an answer here reads as evasive, treat that as a bug and tell us."
      />

      <Section title="Before you deposit">
        <FaqAccordion items={CORE_FAQS} />
      </Section>

      <Section title="Your account" backdrop="grid">
        <FaqAccordion items={ACCOUNT_FAQS} />
      </Section>

      <Section title="Money in and out">
        <FaqAccordion items={MONEY_FAQS} />
      </Section>
      <CtaBand />
    </>
  )
}
