'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import {
  type EmailSampleData,
  type PremiumEmailKey,
  PREMIUM_EMAIL_CATALOG,
  getPremiumEmailMeta,
  renderPremiumEmail,
} from '@/lib/premium-email-templates'

export function EmailHtmlFrame({
  html,
  mode,
  className,
}: {
  html: string
  mode: 'desktop' | 'mobile'
  className?: string
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(mode === 'desktop' ? 720 : 640)

  useEffect(() => {
    const frame = ref.current
    if (!frame) return
    const doc = frame.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    const measure = () => {
      const h = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || 640
      setHeight(Math.min(Math.max(h + 8, 420), 1400))
    }
    measure()
    const t = window.setTimeout(measure, 80)
    return () => window.clearTimeout(t)
  }, [html, mode])

  return (
    <div
      className={cn(
        'mx-auto overflow-hidden rounded-2xl border border-white/10 bg-[#0a1520] shadow-e3',
        mode === 'desktop' ? 'w-full max-w-[640px]' : 'w-[360px] max-w-full',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-white/8 bg-white/[0.04] px-3 py-2">
        <span className="size-2.5 rounded-full bg-loss/70" />
        <span className="size-2.5 rounded-full bg-amber-400/70" />
        <span className="size-2.5 rounded-full bg-profit/70" />
        <span className="ml-2 text-[10px] uppercase tracking-wider text-fg-subtle">
          {mode === 'desktop' ? 'Desktop preview' : 'Mobile preview'}
        </span>
      </div>
      <iframe
        ref={ref}
        title="Email preview"
        className="w-full border-0 bg-[#F1F5F9]"
        style={{ height }}
        sandbox="allow-same-origin"
      />
    </div>
  )
}

export function PremiumEmailPreviewStudio({
  initialKey = 'welcome',
  sample,
  showEditor = false,
  onSubjectChange,
  editableSubject,
}: {
  initialKey?: PremiumEmailKey
  sample?: Partial<EmailSampleData>
  showEditor?: boolean
  editableSubject?: string
  onSubjectChange?: (subject: string) => void
}) {
  const [active, setActive] = useState<PremiumEmailKey>(initialKey)
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')
  const meta = getPremiumEmailMeta(active)
  const html = useMemo(() => renderPremiumEmail(active, sample), [active, sample])

  const groups = useMemo(() => {
    const map = new Map<string, typeof PREMIUM_EMAIL_CATALOG>()
    for (const t of PREMIUM_EMAIL_CATALOG) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return [...map.entries()]
  }, [])

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
        {groups.map(([category, items]) => (
          <div key={category}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              {category}
            </p>
            <ul className="space-y-0.5">
              {items.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-caption transition-colors',
                      active === t.key
                        ? 'bg-accent-500/15 text-accent-200'
                        : 'text-fg-muted hover:bg-hover hover:text-fg',
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: t.accent }}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{t.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-fg-subtle">{meta.category}</p>
            <h2 className="text-heading-sm text-fg">{meta.name}</h2>
            <p className="mt-1 truncate text-caption text-fg-muted">
              {showEditor && onSubjectChange ? (
                <input
                  className="w-full max-w-md rounded-lg border border-white/10 bg-inset/60 px-3 py-1.5 text-caption text-fg"
                  value={editableSubject ?? meta.subject}
                  onChange={(e) => onSubjectChange(e.target.value)}
                />
              ) : (
                meta.subject
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setMode('desktop')}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-caption',
                mode === 'desktop'
                  ? 'border-accent-500/40 bg-accent-500/15 text-accent-200'
                  : 'border-white/10 text-fg-muted',
              )}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setMode('mobile')}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-caption',
                mode === 'mobile'
                  ? 'border-accent-500/40 bg-accent-500/15 text-accent-200'
                  : 'border-white/10 text-fg-muted',
              )}
            >
              Mobile
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-[#07131C]/80 p-4 sm:p-6">
          <EmailHtmlFrame html={html} mode={mode} />
        </div>

        <p className="text-caption text-fg-subtle">
          Unique layout · {meta.description}. Responsive HTML with Growzy branding, CTA, security
          note, footer, and social links. Dark/light compatible via <code>color-scheme</code>.
        </p>
      </div>
    </div>
  )
}
