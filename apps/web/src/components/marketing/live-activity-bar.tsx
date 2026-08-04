'use client'

import { Marquee } from '@/components/motion/marquee'

const EVENTS = [
  { icon: '🟢', text: 'John (UK) deposited $5,000' },
  { icon: '📈', text: 'EUR/USD +1.23%' },
  { icon: '💰', text: 'Emma (Dubai) withdrew $2,800' },
  { icon: '✅', text: 'Daily profit published' },
  { icon: '🌍', text: 'New investor joined from Singapore' },
  { icon: '🟢', text: 'Priya (India) deposited $1,500' },
  { icon: '📈', text: 'XAU/USD +0.48%' },
  { icon: '💰', text: 'Marcus (London) withdrew $4,200' },
  { icon: '✅', text: 'Desk closed 6 positions' },
  { icon: '🌍', text: 'New investor joined from Tokyo' },
] as const

/** Horizontally looping social-proof activity strip. */
export function LiveActivityBar() {
  return (
    <div className="border-y border-glass-line bg-inset/40">
      <div className="container-page flex min-w-0 items-center gap-3 py-2.5">
        <span className="shrink-0 rounded-full border border-hl-emerald/30 bg-hl-emerald/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-hl-emerald">
          Activity
        </span>
        <Marquee speed={42} className="min-w-0 flex-1" pauseOnHover>
          {EVENTS.map((event) => (
            <span
              key={event.text}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/80 px-3 py-1.5 text-caption text-fg-muted"
            >
              <span aria-hidden>{event.icon}</span>
              <span className="whitespace-nowrap text-fg">{event.text}</span>
            </span>
          ))}
        </Marquee>
      </div>
    </div>
  )
}
