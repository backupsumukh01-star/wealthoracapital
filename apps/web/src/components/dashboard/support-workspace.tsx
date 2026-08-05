'use client'

import { useState } from 'react'
import { LifeBuoy, MessageCircle, Ticket } from 'lucide-react'

import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { usePublishedFaqs, usePublishedLanding, usePublishedPlatform, usePublicSettings } from '@/features/cms/site'
import { cn } from '@/lib/cn'
import { supportService } from '@/services/support.service'

export function SupportWorkspace() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [category, setCategory] = useState('deposit')
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { platform, isSuccess: platformReady } = usePublishedPlatform()
  const { landing } = usePublishedLanding()
  const { faqs } = usePublishedFaqs()
  const { data: publicSettings } = usePublicSettings()

  const support = platformReady ? platform.supportBlock : null
  const supportEmail = publicSettings?.supportEmail || landing.supportEmail
  const whatsapp = landing.whatsapp
  const waHref =
    whatsapp && whatsapp.startsWith('http')
      ? whatsapp
      : whatsapp
        ? `https://wa.me/${whatsapp.replace(/\D/g, '')}`
        : supportEmail
          ? `mailto:${supportEmail}`
          : undefined

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Support"
        description={
          support
            ? `${support.headline} ${support.body}`
            : 'Live desk chat, WhatsApp, tickets, and answers to common questions.'
        }
      />

      <Tabs defaultValue="ticket">
        <TabsList className="w-full flex-wrap sm:w-auto">
          <TabsTrigger value="whatsapp">
            <MessageCircle aria-hidden />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="ticket">
            <Ticket aria-hidden />
            Ticket
          </TabsTrigger>
          <TabsTrigger value="faq">
            <LifeBuoy aria-hidden />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-4">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="WhatsApp support"
              description="Message the desk on WhatsApp for deposit proofs and payout questions."
            />
            <p className="mt-4 text-body-sm text-fg-muted">
              Have your User ID and any deposit/withdrawal reference ready.
              {supportEmail ? (
                <>
                  {' '}
                  Or email{' '}
                  <a className="text-accent-300 underline-offset-2 hover:underline" href={`mailto:${supportEmail}`}>
                    {supportEmail}
                  </a>
                  .
                </>
              ) : null}
            </p>
            {waHref ? (
              <Button asChild className="mt-5">
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden />
                  {whatsapp ? 'Open WhatsApp' : 'Email support'}
                </a>
              </Button>
            ) : (
              <p className="mt-5 text-body-sm text-fg-subtle">Support contact is not configured yet.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ticket" className="mt-4">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="Open a ticket"
              description="For issues that need a tracked response from ops."
            />
            <form
              className="mt-5 max-w-xl space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!subject.trim() || !details.trim()) return
                setSubmitting(true)
                try {
                  const ticket = await supportService.create({
                    subject,
                    body: details,
                    category,
                  })
                  toast.success('Ticket created', ticket.id)
                  setSubject('')
                  setDetails('')
                } catch {
                  toast.error('Could not create ticket. Please try again.')
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <FormField label="Category" required>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="account">Account / KYC</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Subject" required>
                <Input
                  placeholder="Short summary"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </FormField>
              <FormField label="Details" required>
                <Textarea
                  rows={5}
                  placeholder="Describe the issue and include references…"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </FormField>
              <Button type="submit" loading={submitting}>
                <Ticket aria-hidden />
                Submit ticket
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader title="FAQ" description="Quick answers for common investor questions." />
            {faqs.length === 0 ? (
              <PremiumEmptyState
                variant="support"
                title="No FAQs yet"
                description="Common questions will appear here as the desk publishes them."
              />
            ) : (
              <ul className="mt-5 space-y-2">
                {faqs.map((item, index) => {
                  const open = openFaq === index
                  return (
                    <li key={item.id || item.question} className="overflow-hidden rounded-xl border border-line">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-body-sm font-medium text-fg hover:bg-hover/40"
                        aria-expanded={open}
                        onClick={() => setOpenFaq(open ? null : index)}
                      >
                        {item.question}
                        <span
                          className={cn(
                            'text-fg-subtle transition-transform duration-200',
                            open && 'rotate-45',
                          )}
                          aria-hidden
                        >
                          +
                        </span>
                      </button>
                      {open ? (
                        <p className="border-t border-line bg-inset/30 px-4 py-3 text-body-sm text-fg-muted">
                          {item.answer}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
