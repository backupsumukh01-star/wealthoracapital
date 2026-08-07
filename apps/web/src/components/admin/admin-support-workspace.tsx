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

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const

type TicketRow = Omit<SupportTicket, 'priority' | 'messages'> & {
  priority: (typeof PRIORITIES)[number]
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
  const priority = PRIORITIES.includes(t.priority as (typeof PRIORITIES)[number])
    ? (t.priority as (typeof PRIORITIES)[number])
    : 'NORMAL'
  return {
    ...t,
    priority,
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

  useEffect(() => {
    if (!selectedId && tickets[0]?.id) setSelectedId(tickets[0].id)
  }, [tickets, selectedId])

  const selected = tickets.find((t) => t.id === selectedId)

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

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: TicketRow['priority'] }) =>
      supportService.adminUpdatePriority(id, priority),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'support', 'tickets'] })
      toast.success('Priority updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update priority'),
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => supportService.adminClose(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'support', 'tickets'] })
      toast.success('Ticket closed')
    },
    onError: (err: Error) => toast.error(err.message || 'Could not close ticket'),
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
                      {t.userLabel} · {t.status} · {t.priority}
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
                    value={selected.priority}
                    disabled={priorityMutation.isPending}
                    onChange={(e) =>
                      priorityMutation.mutate({
                        id: selected.id,
                        priority: e.target.value as TicketRow['priority'],
                      })
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={closeMutation.isPending}
                    onClick={() => closeMutation.mutate(selected.id)}
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
                      'rounded-lg border px-3 py-2 text-caption',
                      m.from === 'agent'
                        ? 'border-accent-500/20 bg-accent-500/10'
                        : m.from === 'internal'
                          ? 'border-warning/20 bg-warning/10'
                          : 'border-white/[0.06] bg-white/[0.02]',
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{m.from}</p>
                    <p className="mt-1 whitespace-pre-wrap text-fg">{m.body}</p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <FormField label="Reply">
                <Textarea
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="border-white/10 bg-white/[0.04]"
                />
              </FormField>
              <Button
                type="button"
                size="sm"
                disabled={!reply.trim() || replyMutation.isPending}
                onClick={() =>
                  replyMutation.mutate({ id: selected.id, message: reply.trim() })
                }
              >
                Send reply
              </Button>
            </div>
          </AdminPanel>
        ) : (
          <AdminPanel className="grid place-items-center p-8 text-caption text-fg-subtle">
            Select a ticket
          </AdminPanel>
        )}
      </div>
    </div>
  )
}
