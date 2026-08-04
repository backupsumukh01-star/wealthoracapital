'use client'

import { useEffect, useState } from 'react'
import { Paperclip, Send } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

type ChatMsg = {
  id: string
  from: 'agent' | 'user'
  text: string
  time: string
}

const SEED: ChatMsg[] = [
  {
    id: 'm1',
    from: 'agent',
    text: 'Hi Ayesha — welcome to Growzy Support. How can we help with your account today?',
    time: '10:42',
  },
  {
    id: 'm2',
    from: 'user',
    text: 'I have a question about my pending deposit.',
    time: '10:43',
  },
  {
    id: 'm3',
    from: 'agent',
    text: 'Sure — share the deposit ID (e.g. DEP-2026-000418) and we’ll check the queue.',
    time: '10:43',
  },
]

const CHIPS = ['Deposit status', 'Withdrawal timing', 'KYC help', 'Daily returns']

/** Intercom-inspired support conversation — demo UI only. */
export function SupportChatWidget() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [messages, setMessages] = useState(SEED)
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setTimeout(() => setTyping(true), 2200)
    const off = window.setTimeout(() => setTyping(false), 5200)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(off)
    }
  }, [prefersReducedMotion])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: trimmed, time },
    ])
    setDraft('')
    setTyping(true)
    window.setTimeout(() => {
      setTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          from: 'agent',
          text: 'Thanks — a desk specialist is reviewing this. Typical reply under 5 minutes (demo).',
          time,
        },
      ])
    }, 1600)
  }

  return (
    <div className="flex min-h-[min(480px,65dvh)] flex-col overflow-hidden rounded-3xl border border-glass-line bg-[rgb(10_20_30/0.72)] shadow-e3 backdrop-blur-xl">
      {/* Agent header */}
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
        <span className="relative shrink-0">
          <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-accent-400 to-hl-cyan text-sm font-semibold text-accent-foreground shadow-glow">
            SD
          </span>
          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-raised bg-profit">
            <span className="absolute inset-0 animate-ping rounded-full bg-profit/60" aria-hidden />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-fg">Sara · Wealth Desk</p>
          <p className="text-caption text-profit">Online · usually replies in minutes</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-white/6 px-4 py-2.5 sm:px-5">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => send(chip)}
            className={cn(
              'shrink-0 rounded-full border border-accent-700/35 bg-accent-500/10 px-3 py-1.5',
              'text-[11px] font-medium text-accent-200 transition-colors',
              'hover:border-accent-600/50 hover:bg-accent-500/18',
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Thread */}
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex flex-col', m.from === 'user' ? 'items-end' : 'items-start')}
          >
            <div
              className={cn(
                'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed sm:max-w-[80%] sm:text-body-sm',
                m.from === 'user'
                  ? 'rounded-br-md bg-accent-500/25 text-fg'
                  : 'rounded-bl-md border border-white/8 bg-inset/70 text-fg-muted',
              )}
            >
              {m.text}
            </div>
            <span className="mt-1 px-1 text-[10px] tabular-nums text-fg-subtle">{m.time}</span>
          </div>
        ))}

        {typing ? (
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-accent-400/80 to-hl-cyan/80 text-[9px] font-semibold text-accent-foreground">
              SD
            </span>
            <motion.div
              className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/8 bg-inset/70 px-3 py-2.5"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1.5 rounded-full bg-fg-subtle"
                  animate={prefersReducedMotion ? undefined : { opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
              <span className="sr-only">Agent is typing</span>
            </motion.div>
          </div>
        ) : null}
      </div>

      {/* Composer */}
      <form
        className="flex items-center gap-2 border-t border-white/8 px-3 py-3 sm:px-4"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        <button
          type="button"
          aria-label="Attach file"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
          onClick={() => toast.info('Attachments are a UI preview.')}
        >
          <Paperclip className="size-5" aria-hidden />
        </button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the desk…"
          className="min-w-0 flex-1"
          aria-label="Message"
        />
        <Button type="submit" size="icon" className="shrink-0 shadow-glow" aria-label="Send">
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  )
}
