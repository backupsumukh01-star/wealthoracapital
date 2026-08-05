'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Alert } from '@/components/ui/alert'
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
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/format'
import { broadcastService, type Broadcast } from '@/services/broadcast.service'
import { useAdminUsers } from '@/features/admin/hooks'

type Segment = 'ALL' | 'VERIFIED' | 'PENDING_KYC'
type Channel = 'IN_APP' | 'EMAIL' | 'BOTH'

function mapChannels(channel: Channel): Broadcast['channels'] {
  if (channel === 'BOTH') return ['EMAIL', 'IN_APP']
  if (channel === 'EMAIL') return ['EMAIL']
  return ['IN_APP']
}

function audienceForSegment(segment: Segment): Broadcast['audience'] {
  return segment === 'ALL' ? 'ALL' : 'SEGMENT'
}

export function AdminBroadcastWorkspace() {
  const qc = useQueryClient()
  const { data: usersData } = useAdminUsers()
  const { data: listData } = useQuery({
    queryKey: ['admin', 'broadcasts'],
    queryFn: () => broadcastService.list(),
  })

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [segment, setSegment] = useState<Segment>('ALL')
  const [channel, setChannel] = useState<Channel>('BOTH')

  const users = usersData?.items ?? []
  const recipients =
    segment === 'ALL'
      ? users.length
      : segment === 'VERIFIED'
        ? users.filter((u) => u.kycStatus === 'APPROVED').length
        : users.filter((u) => u.kycStatus !== 'APPROVED').length

  const history = (listData?.items ?? []).filter(
    (n) => n.status === 'SENT' || n.audience === 'ALL' || n.audience === 'SEGMENT',
  )

  const sendMutation = useMutation({
    mutationFn: async () => {
      const created = await broadcastService.create({
        title: subject.trim(),
        body: body.trim(),
        channels: mapChannels(channel),
        audience: audienceForSegment(segment),
        audienceFilter:
          segment === 'ALL'
            ? undefined
            : { kyc: segment === 'VERIFIED' ? 'APPROVED' : 'PENDING' },
      })
      return broadcastService.send(created.id)
    },
    onSuccess: (sent) => {
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] })
      toast.success('Broadcast sent', {
        description: `${sent.stats?.recipientCount ?? recipients} recipients · ${channel}`,
      })
      setSubject('')
      setBody('')
    },
    onError: (err: Error) => toast.error(err.message || 'Broadcast failed'),
  })

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required')
      return
    }
    sendMutation.mutate()
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Broadcast"
        description="Send an announcement to a segment of investors, in-app and optionally by email."
      />

      <Alert tone="warning" title="A broadcast cannot be recalled">
        Preview the rendered message and confirm the recipient count before sending.
      </Alert>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <AdminPanel glow>
          <AdminPanelHeader
            title="Compose"
            description="Plain language. No pressure tactics about depositing."
          />
          <form onSubmit={handleSend} className="space-y-4 p-4 sm:p-5">
            <FormField label="Subject" required>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Announcement title"
              />
            </FormField>
            <FormField label="Body" required>
              <Textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message…"
              />
            </FormField>
            <FormField label="Channel" required>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_APP">In-app</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <Button type="submit" disabled={sendMutation.isPending}>
              Send broadcast
            </Button>
          </form>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel>
            <AdminPanelHeader title="Audience" />
            <div className="space-y-4 p-4 sm:p-5">
              <FormField label="Segment">
                <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All investors</SelectItem>
                    <SelectItem value="VERIFIED">Verified only</SelectItem>
                    <SelectItem value="PENDING_KYC">Pending KYC</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <p className="text-body-sm text-fg">
                <span className="tabular-nums text-heading-sm">{recipients.toLocaleString()}</span>
                <span className="ml-2 text-fg-muted">recipients</span>
              </p>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Preview" />
            <div className="space-y-2 p-4 sm:p-5">
              <p className="text-body-sm font-medium text-fg">{subject.trim() || 'Subject preview'}</p>
              <p className="whitespace-pre-wrap text-caption text-fg-muted">
                {body.trim() || 'Body preview appears here as you type.'}
              </p>
            </div>
          </AdminPanel>
        </div>
      </div>

      <AdminPanel>
        <AdminPanelHeader title="Past broadcasts" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Subject</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium sm:px-5">Sent</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-fg-subtle sm:px-5">
                    No broadcasts yet.
                  </td>
                </tr>
              ) : (
                history.map((n) => (
                  <tr key={n.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 font-medium text-fg sm:px-5">{n.title}</td>
                    <td className="px-4 py-3 text-fg-muted">{n.audience}</td>
                    <td className="px-4 py-3 text-fg-muted">{n.channels.join(', ')}</td>
                    <td className="px-4 py-3 text-fg-muted sm:px-5">
                      {n.sentAt ? formatDateTime(n.sentAt) : n.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
