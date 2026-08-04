'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { useAdminOs } from '@/providers/admin-os-provider'
import type { SupportTicket } from '@/lib/admin-os-store'
import { cn } from '@/lib/cn'

const selectClass =
  'h-8 rounded-lg border border-white/10 bg-inset/60 px-2 text-caption text-fg'

export function AdminSupportWorkspace() {
  const { state, replyTicket, assignTicket, closeTicket, setTicketPriority } = useAdminOs()
  const [selectedId, setSelectedId] = useState(state.tickets[0]?.id ?? '')
  const [reply, setReply] = useState('')
  const selected = state.tickets.find((t) => t.id === selectedId)

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
            {state.tickets.map((t) => (
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
            ))}
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
                    onChange={(e) =>
                      setTicketPriority(selected.id, e.target.value as SupportTicket['priority'])
                    }
                  >
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="glass"
                    onClick={() => {
                      assignTicket(selected.id, 'support@growzy.com')
                      toast.success('Assigned to support')
                    }}
                  >
                    Assign me
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      closeTicket(selected.id)
                      toast.success('Ticket closed')
                    }}
                  >
                    Close
                  </Button>
                </div>
              }
            />
            <div className="space-y-3 border-b border-white/[0.06] p-4 sm:p-5">
              {selected.messages.map((m) => (
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
              ))}
            </div>
            <div className="grid gap-3 p-4 sm:p-5">
              <FormField label="Reply">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (!reply.trim()) return
                    replyTicket(selected.id, reply)
                    setReply('')
                    toast.success('Reply sent')
                  }}
                >
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => {
                    if (!reply.trim()) return
                    replyTicket(selected.id, reply, true)
                    setReply('')
                    toast.success('Internal note added')
                  }}
                >
                  Internal note
                </Button>
                <span className="self-center text-caption text-fg-subtle">
                  Attachments: demo UI ready for API upload
                </span>
              </div>
            </div>
          </AdminPanel>
        ) : null}
      </div>
    </div>
  )
}
