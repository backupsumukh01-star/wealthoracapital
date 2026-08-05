'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Send } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { broadcastService, type Broadcast } from '@/services/broadcast.service'

const CHANNELS = ['BANNER', 'POPUP', 'DASHBOARD', 'PUSH', 'EMAIL', 'ANNOUNCEMENT'] as const
const AUDIENCES = ['ALL', 'SELECTED', 'SINGLE', 'COUNTRY', 'VIP'] as const

function toApiChannels(channels: string[]): Broadcast['channels'] {
  const out: Broadcast['channels'] = []
  for (const c of channels) {
    if (c === 'EMAIL') out.push('EMAIL')
    else if (c === 'BANNER') out.push('BANNER')
    else if (c === 'POPUP') out.push('POPUP')
    else if (c === 'ANNOUNCEMENT') out.push('ANNOUNCEMENT')
    else if (c === 'DASHBOARD' || c === 'PUSH') out.push('IN_APP')
  }
  return out.length ? Array.from(new Set(out)) : ['IN_APP']
}

function toApiAudience(audience: (typeof AUDIENCES)[number]): Broadcast['audience'] {
  if (audience === 'ALL') return 'ALL'
  if (audience === 'VIP') return 'VIP'
  if (audience === 'COUNTRY') return 'COUNTRY'
  if (audience === 'SINGLE') return 'SINGLE'
  return 'SELECTED'
}

export function AdminNotificationsWorkspace() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin', 'broadcasts', 'notifications'],
    queryFn: () => broadcastService.list(),
  })
  const sent = data?.items ?? []

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>('ALL')
  const [audienceDetail, setAudienceDetail] = useState('All investors')
  const [channels, setChannels] = useState<string[]>(['DASHBOARD', 'EMAIL'])
  const [preview, setPreview] = useState(false)

  const selectClass =
    'h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg'

  const sendMutation = useMutation({
    mutationFn: async () => {
      const created = await broadcastService.create({
        title: title.trim(),
        body: body.trim(),
        channels: toApiChannels(channels),
        audience: toApiAudience(audience),
        audienceFilter: audience === 'ALL' ? undefined : { detail: audienceDetail },
      })
      return broadcastService.send(created.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] })
      toast.success('Notification sent')
      setTitle('')
      setBody('')
      setPreview(false)
    },
    onError: (err: Error) => toast.error(err.message || 'Send failed'),
  })

  function toggleChannel(c: string) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }
    if (channels.length === 0) {
      toast.error('Select at least one channel')
      return
    }
    sendMutation.mutate()
  }

  const stats = useMemo(
    () => [
      String(sent.length),
      String(sent.filter((c) => c.channels.includes('EMAIL')).length),
      String(sent.filter((c) => c.audience === 'ALL').length),
      String(sent.filter((c) => c.status === 'DRAFT').length),
    ],
    [sent],
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Notification Builder"
        description="Target all, selected, single, country, or VIP. Preview before sending."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns sent" value={stats[0]!} />
        <StatCard label="With email" value={stats[1]!} />
        <StatCard label="Broadcast all" value={stats[2]!} />
        <StatCard label="Drafts" value={stats[3]!} />
      </div>

      <AdminPanel glow>
        <AdminPanelHeader title="Compose" description="Channels: banner, popup, dashboard, push, email, announcement." />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Title" required className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Body" required className="sm:col-span-2">
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </FormField>
          <FormField label="Audience">
            <select
              className={selectClass}
              value={audience}
              onChange={(e) => {
                const v = e.target.value as typeof audience
                setAudience(v)
                setAudienceDetail(
                  v === 'ALL'
                    ? 'All investors'
                    : v === 'VIP'
                      ? 'VIP segment'
                      : v === 'COUNTRY'
                        ? 'IN'
                        : 'USR_…',
                )
              }}
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Audience detail">
            <Input value={audienceDetail} onChange={(e) => setAudienceDetail(e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <p className="mb-2 text-caption text-fg-muted">Channels</p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChannel(c)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-medium',
                    channels.includes(c)
                      ? 'border-accent-500/40 bg-accent-500/20 text-accent-200'
                      : 'border-white/10 bg-white/5 text-fg-muted',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" variant="glass" onClick={() => setPreview(true)}>
              <Eye aria-hidden />
              Preview
            </Button>
            <Button type="button" onClick={handleSend} disabled={sendMutation.isPending}>
              <Send aria-hidden />
              Send
            </Button>
          </div>
        </div>
      </AdminPanel>

      {preview ? (
        <AdminPanel>
          <AdminPanelHeader title="Preview" action={
            <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(false)}>
              Close
            </Button>
          } />
          <div className="p-5">
            <p className="text-caption text-fg-subtle">
              {audience} · {audienceDetail} · {channels.join(', ')}
            </p>
            <p className="mt-2 text-heading-sm text-fg">{title || 'Untitled'}</p>
            <p className="mt-2 text-body-sm text-fg-muted">{body || '…'}</p>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel>
        <AdminPanelHeader title="History" />
        <ul className="divide-y divide-white/[0.04]">
          {sent.length === 0 ? (
            <li className="px-4 py-8 text-center text-caption text-fg-subtle sm:px-5">
              No campaigns sent yet.
            </li>
          ) : (
            sent.map((c) => (
              <li key={c.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-fg">{c.title}</p>
                  <span className="text-caption text-fg-subtle">
                    {c.sentAt ? formatDateTime(c.sentAt) : c.status}
                  </span>
                </div>
                <p className="mt-1 text-caption text-fg-muted">
                  {c.audience} · {c.channels.join(', ')}
                </p>
              </li>
            ))
          )}
        </ul>
      </AdminPanel>
    </div>
  )
}
