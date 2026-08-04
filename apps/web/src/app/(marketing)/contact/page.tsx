import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'
import { Clock, Mail, LayoutDashboard } from 'lucide-react'

import { Section } from '@/components/common/section'
import { ContactForm } from '@/components/marketing/contact-form'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { RiskBanner } from '@/components/marketing/risk-banner'
import { Card } from '@/components/ui/card'
import { SITE } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Contact support',
  description: 'Reach the operations team about your account, a deposit, or a withdrawal.',
  alternates: { canonical: ROUTES.marketing.contact },
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Support"
        title="Talk to a person"
        description="Account questions, a deposit that has not been credited, or a payout you are waiting on — this reaches the operations team directly."
      />

      <Section>
        <div className="grid min-w-0 gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <Card className="min-w-0 overflow-hidden p-6 lg:p-8">
            <ContactForm />
          </Card>

          <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="min-w-0 p-6 lg:p-8">
              <Mail className="size-5 text-accent-400" aria-hidden />
              <h2 className="text-heading-sm mt-4 text-fg">Email</h2>
              <a
                className="text-body-sm mt-1 inline-block max-w-full break-all text-accent-300 underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base rounded-sm"
                href={`mailto:${SITE.supportEmail}`}
              >
                {SITE.supportEmail}
              </a>
            </Card>

            <Card className="min-w-0 p-6 lg:p-8">
              <Clock className="size-5 text-accent-400" aria-hidden />
              <h2 className="text-heading-sm mt-4 text-fg">Response times</h2>
              <p className="text-body-sm mt-1 text-fg-muted">
                Account and payment queries are answered during desk hours. Withdrawal requests are
                reviewed on their own schedule and do not need a support ticket to progress.
              </p>
            </Card>

            <Card className="min-w-0 p-6 lg:p-8 sm:col-span-2 lg:col-span-1" variant="inset">
              <LayoutDashboard className="size-5 text-accent-400" aria-hidden />
              <h2 className="text-heading-sm mt-4 text-fg">Before you write</h2>
              <p className="text-body-sm mt-1 text-fg-muted">
                Deposit and withdrawal statuses are live in your dashboard, including the reason for
                any rejection. Checking there first is usually faster than waiting on a reply.
              </p>
            </Card>
          </div>
        </div>
      </Section>

      <RiskBanner />
      <CtaBand />
    </>
  )
}
