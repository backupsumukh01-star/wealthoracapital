'use client'

import { useState } from 'react'
import { LifeBuoy, MessageCircle, MessagesSquare, Ticket } from 'lucide-react'

import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { SupportChatWidget } from '@/components/dashboard/support-chat-widget'
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
import { SUPPORT_FAQS } from '@/lib/investor-demo-data'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

const WHATSAPP_URL = 'https://wa.me/15551234567?text=Hi%20Growzy%20support'

export function SupportWorkspace() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const { ready, state } = useAdminOs()
  const support = ready ? state.platformCms.supportBlock : null
  const whatsapp = ready ? state.global.supportWhatsApp : ''
  const waHref =
    whatsapp && whatsapp.startsWith('http')
      ? whatsapp
      : whatsapp
        ? `https://wa.me/${whatsapp.replace(/\D/g, '')}`
        : WHATSAPP_URL

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

      <Tabs defaultValue="chat">
        <TabsList className="w-full flex-wrap sm:w-auto">
          <TabsTrigger value="chat">
            <MessagesSquare aria-hidden />
            Live Chat
          </TabsTrigger>
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

        <TabsContent value="chat" className="mt-4">
          <SupportChatWidget />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="WhatsApp support"
              description="Message the desk on WhatsApp for deposit proofs and payout questions."
            />
            <p className="mt-4 text-body-sm text-fg-muted">
              Have your User ID and any deposit/withdrawal reference ready. Demo number only —
              replace before launch.
            </p>
            <Button asChild className="mt-5">
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden />
                Open WhatsApp
              </a>
            </Button>
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
              onSubmit={(e) => {
                e.preventDefault()
                toast.success('Ticket created (demo)', 'TKT-2026-00412')
              }}
            >
              <FormField label="Category" required>
                <Select defaultValue="deposit">
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
                <Input placeholder="Short summary" />
              </FormField>
              <FormField label="Details" required>
                <Textarea rows={5} placeholder="Describe the issue and include references…" />
              </FormField>
              <Button type="submit">
                <Ticket aria-hidden />
                Submit ticket
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader title="FAQ" description="Quick answers for common investor questions." />
            {SUPPORT_FAQS.length === 0 ? (
              <PremiumEmptyState
                variant="support"
                title="No FAQs yet"
                description="Common questions will appear here as the desk publishes them."
              />
            ) : (
              <ul className="mt-5 space-y-2">
                {SUPPORT_FAQS.map((item, index) => {
                  const open = openFaq === index
                  return (
                    <li key={item.q} className="overflow-hidden rounded-xl border border-line">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-body-sm font-medium text-fg hover:bg-hover/40"
                        aria-expanded={open}
                        onClick={() => setOpenFaq(open ? null : index)}
                      >
                        {item.q}
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
                          {item.a}
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
