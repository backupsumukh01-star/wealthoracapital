'use client'

import { useEffect, useState } from 'react'

const ZONES = [
  { id: 'lon', label: 'London', timeZone: 'Europe/London' },
  { id: 'ny', label: 'New York', timeZone: 'America/New_York' },
  { id: 'dxb', label: 'Dubai', timeZone: 'Asia/Dubai' },
  { id: 'sg', label: 'Singapore', timeZone: 'Asia/Singapore' },
] as const

function formatZone(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
}

/** Compact multi-city market clock strip. */
export function MarketClocks({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
        Current market time
      </p>
      <ul className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ZONES.map((z) => (
          <li
            key={z.id}
            className="rounded-xl border border-white/5 bg-inset/40 px-2.5 py-2"
          >
            <p className="text-[10px] text-fg-subtle">{z.label}</p>
            <p className="mt-0.5 font-mono text-caption tabular-nums text-fg" aria-live="polite">
              {formatZone(now, z.timeZone)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
