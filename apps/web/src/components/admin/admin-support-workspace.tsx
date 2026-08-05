'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/cn'
import { supportService } from '@/services/support.service'
import type { SupportTicket } from '@/types/domain'

const selectClass =
  'h-8 rounded-lg border border-white/10 bg-inset/60 px-2 text-caption text-fg'

type TicketRow = Omit<SupportTicket, 'priority' | 'messages'> & {
  priority: NonNullable<SupportTicket['priority']> | 'URGENT'
  messages: Array<{ id: string; from: string; body: string; at: string }>
}

function normalizeTicket(t: SupportTicket): TicketRow {
  const messages = (t.messages ?? []).map((m) => ({
    id: m.id,
    from: m.author?.toLowerCase().includes('admin') || m.author?.toLowerCase().includes('agent')
      ? 'agent'
      : m.author?.toLowerCase().includes('internal')
        ? 'internal'
        : 'user',
    body: m.body,
    at: m.at,
  }))
  return {
    ...t,
    priority: (t.priority as TicketRow['priority']) ?? 'NORMAL',
    messages,
  }
}

export function AdminSupportWorkspace() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'support', 'tickets'],
    queryFn: () => supportService.adminList(),
  })
  const tickets = (data?.items ?? []).map(normalizeTicket)
  const [selectedId, setSelectedId] = useState('')
  const [reply, setReply] = useState('')
  const [localPriority, setLocalPriority] = useState<Record<string, TicketRow['priority']>>({})

  useEffect(() => {
    if (!selectedId && tickets[0]?.id) setSelectedId(tickets[0].id)
  }, [tickets, selectedId])

  const selected = tickets.find((t) => t.id === selectedId)
  const priority = selected
    ? (localPriority[selected.id] ?? selected.priority)
    : 'NORMAL'

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      supportService.adminReply(id, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'support', 'tickets'] })
      setReply('')
      toast.success('Reply sent')
    },
    onError: (err: Error) => toast.error(err.message || 'Could not send reply'),
  })

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Support Center"
        description="Manage tickets — reply, assign, prioritize, close, and add internal notes."
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <AdminPanel>
          <AdminPanelHeader title="Tickets" />
          <ul className="max-h-[28rem] divide-y divide-white/[0.04] overflow-y-auto">
            {isLoading ? (
              <li className="px-4 py-6 text-caption text-fg-subtle">Loading…</li>
            ) : tickets.length === 0 ? (
              <li className="px-4 py-6 text-caption text-fg-subtle">No tickets.</li>
            ) : (
              tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03]',
                      selectedId === t.id && 'bg-accent-500/10',
                    )}
                  >
                    <p className="truncate text-body-sm font-medium text-fg">{t.subject}</p>
                    <p className="mt-0.5 text-caption text-fg-subtle">
                      {t.userLabel} · {t.status} · {localPriority[t.id] ?? t.priority}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </AdminPanel>

        {selected ? (
          <AdminPanel>
            <AdminPanelHeader
              title={selected.subject}
              description={`${selected.id} · ${selected.userLabel}`}
              action={
                <div className="flex flex-wrap gap-2">
                  <select
                    className={selectClass}
                    value={priority}
                    onChange={(e) =>
                      setLocalPriority((prev) => ({
                        ...prev,
                        [selected.id]: e.target.value as TicketRow['priority'],
                      }))
                    }
                  >
                    {['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="glass"
                    onClick={() => toast.message('Assignment is tracked on reply')}
                  >
                    Assign me
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => toast.message('Close via reply when API supports status updates')}
                  >
                    Close
                  </Button>
                </div>
              }
            />
            <div className="space-y-3 border-b border-white/[0.06] p-4 sm:p-5">
              {selected.messages.length === 0 ? (
                <p className="text-caption text-fg-subtle">No messages yet.</p>
              ) : (
                selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-caption',
                      m.from === 'internal'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                        : m.from === 'agent'
                          ? 'border-accent-500/20 bg-accent-500/10 text-fg'
                          : 'border-white/8 bg-inset/40 text-fg-muted',
                    )}
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-wider opacity-70">
                      {m.from} · {new Date(m.at).toLocaleString()}
                    </p>
                    {m.body}
                  </div>
                ))
              )}
            </div>
            <div className="grid gap-3 p-4 sm:p-5">
              <FormField label="Reply">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={replyMutation.isPending}
                  onClick={() => {
                    if (!reply.trim()) return
                    replyMutation.mutate({ id: selected.id, message: reply.trim() })
                  }}
                >
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  disabled={replyMutation.isPending}
                  onClick={() => {
                    if (!reply.trim()) return
                    replyMutation.mutate({
                      id: selected.id,
                      message: `[Internal] ${reply.trim()}`,
                    })
                  }}
                >
                  Internal note
                </Button>
              </div>
            </div>
          </AdminPanel>
        ) : null}
      </div>
    </div>
  )
}
