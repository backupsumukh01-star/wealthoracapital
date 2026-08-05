'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
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
import { formatDateTime } from '@/lib/format'
import { emailAdminService } from '@/services/email-admin.service'

const TEMPLATES: { id: string; subject: string; body: string }[] = [
  {
    id: 'Welcome',
    subject: 'Welcome to Growzy',
    body: 'Your account is ready. Verify your email and complete KYC to unlock deposits.',
  },
  {
    id: 'KYC',
    subject: 'KYC status update',
    body: 'We have an update on your identity verification. Sign in to review next steps.',
  },
  {
    id: 'Deposit',
    subject: 'Deposit received',
    body: 'We received your deposit proof and are reviewing it. You will be notified when credited.',
  },
  {
    id: 'Withdrawal',
    subject: 'Withdrawal update',
    body: 'Your withdrawal request has been updated. Check your wallet for the latest status.',
  },
  {
    id: 'Marketing',
    subject: 'Growzy desk update',
    body: 'A short note from the trading desk on recent performance and platform updates.',
  },
  {
    id: 'Custom',
    subject: '',
    body: '',
  },
]

type TemplateId = string

export function AdminEmailCenter() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'email-outbox'],
    queryFn: () => emailAdminService.listOutbox(),
  })
  const emails = data?.items ?? []
  const [templateId, setTemplateId] = useState<TemplateId>('Welcome')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState<string>(TEMPLATES[0]?.subject ?? 'Welcome to Growzy')
  const [body, setBody] = useState<string>(
    TEMPLATES[0]?.body ?? 'Your account is ready. Verify your email and complete KYC to unlock deposits.',
  )

  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]!,
    [templateId],
  )

  function applyTemplate(id: TemplateId) {
    setTemplateId(id)
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    if (id !== 'Custom') {
      setSubject(t.subject)
      setBody(t.body)
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('To, subject, and body are required')
      return
    }
    toast.message('Compose send requires email API template key', {
      description: 'Use Email templates to send a test, or map this form to sendTest.',
    })
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Email center"
        description="Compose transactional mail from templates, plus the API outbox."
      />

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="outbox">Outbox ({emails.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-5">
          <AdminPanel glow>
            <AdminPanelHeader
              title="Compose"
              description="Templates are local drafts — send via the email API when wired."
            />
            <form onSubmit={handleSend} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <FormField label="Template" className="sm:col-span-2">
                <Select value={templateId} onValueChange={(v) => applyTemplate(v as TemplateId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="To" required className="sm:col-span-2">
                <Input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="investor@example.com"
                />
              </FormField>
              <FormField label="Subject" required className="sm:col-span-2">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </FormField>
              <FormField label="Body" required className="sm:col-span-2">
                <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit">Send email</Button>
              </div>
            </form>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Template preview" description={template?.id ?? 'Custom'} />
            <div className="space-y-2 p-4 sm:p-5">
              <p className="text-body-sm font-medium text-fg">{subject || '—'}</p>
              <p className="whitespace-pre-wrap text-caption text-fg-muted">{body || '—'}</p>
            </div>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="outbox">
          <AdminPanel>
            <AdminPanelHeader
              title="Email outbox"
              description="Messages returned by the admin email API."
            />
            {emails.length === 0 ? (
              <p className="p-4 text-body-sm text-fg-muted sm:p-5">
                {isLoading ? 'Loading outbox…' : 'No outbox data from API'}
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {emails.map((em) => (
                  <li key={em.id} className="space-y-1 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body-sm font-medium text-fg">{em.subject}</p>
                      <span className="text-caption text-fg-subtle">
                        {formatDateTime(em.sentAt ?? em.createdAt)}
                      </span>
                    </div>
                    <p className="text-caption text-fg-muted">
                      To {em.to} · {em.templateKey ?? em.status}
                    </p>
                    <p className="text-body-sm text-fg-subtle">
                      {em.status}
                      {em.lastError ? ` · ${em.lastError}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
