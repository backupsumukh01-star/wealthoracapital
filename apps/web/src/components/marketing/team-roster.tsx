'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/cn'

const FLAGS: Record<string, string> = {
  GB: '🇬🇧',
  AE: '🇦🇪',
  SG: '🇸🇬',
  US: '🇺🇸',
}

export type TeamMember = {
  name: string
  role: string
  experience: string
  country: keyof typeof FLAGS | string
  status: 'Online' | 'On desk' | 'Reviewing'
  focus: string
}

const DEFAULT_TEAM: TeamMember[] = [
  {
    name: 'Daniel H.',
    role: 'Portfolio Manager',
    experience: '12 yrs FX',
    country: 'GB',
    status: 'On desk',
    focus: 'Session allocation & size',
  },
  {
    name: 'Amira K.',
    role: 'Risk Manager',
    experience: '9 yrs risk',
    country: 'AE',
    status: 'Online',
    focus: 'Limits, stops, book heat',
  },
  {
    name: 'James R.',
    role: 'Operations Manager',
    experience: '8 yrs ops',
    country: 'SG',
    status: 'Reviewing',
    focus: 'Deposits & payouts',
  },
  {
    name: 'Sofia M.',
    role: 'Compliance Officer',
    experience: '10 yrs compliance',
    country: 'US',
    status: 'Online',
    focus: 'Ledger & audit trails',
  },
]

/** Premium glass team cards — demo names for presentation. */
export const TeamRoster = memo(function TeamRoster({
  members = DEFAULT_TEAM,
}: {
  members?: TeamMember[]
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {members.map((m, i) => {
        const [first, ...rest] = m.name.split(' ')
        const last = rest.join(' ')
        return (
          <li key={m.name}>
            <motion.article
              className={cn(
                'group relative h-full overflow-hidden rounded-2xl border border-white/10',
                'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent p-5',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl',
                'transition-[transform,box-shadow] duration-300',
                'hover:-translate-y-1 hover:shadow-[0_0_32px_-10px_rgba(212,217,223,0.45)]',
              )}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="relative">
                  <Avatar size="lg">
                    <AvatarFallback>{initialsOf(first, last)}</AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#07090B] bg-profit shadow-[0_0_8px_rgba(212,217,223,0.8)]"
                    aria-hidden
                  />
                </div>
                <Badge tone="profit" size="sm" className="shrink-0">
                  {m.status}
                </Badge>
              </div>

              <h3 className="mt-4 text-heading-sm text-fg">{m.name}</h3>
              <p className="mt-0.5 text-body-sm text-accent-200">{m.role}</p>
              <p className="mt-2 text-caption text-fg-subtle">{m.focus}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-fg-muted">
                  <span aria-hidden>{FLAGS[m.country] ?? '🌍'}</span>
                  {m.country}
                </span>
                <span className="rounded-full border border-accent-700/40 bg-accent-500/10 px-2.5 py-1 text-[11px] font-medium text-accent-200">
                  {m.experience}
                </span>
              </div>
            </motion.article>
          </li>
        )
      })}
    </ul>
  )
})
