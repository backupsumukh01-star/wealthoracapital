'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Landmark, Users } from 'lucide-react'

import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { INVESTOR_HUBS, MAP_LINKS } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

const W = 1000
const H = 520

type Hub = (typeof INVESTOR_HUBS)[number]

function hubPoint(hub: Hub) {
  return { x: (hub.x / 100) * W, y: (hub.y / 100) * H }
}

function curvePath(a: Hub, b: Hub) {
  const p1 = hubPoint(a)
  const p2 = hubPoint(b)
  const mx = (p1.x + p2.x) / 2
  const my = Math.min(p1.y, p2.y) - 40 - Math.abs(p1.x - p2.x) * 0.06
  return `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`
}

/** Custom tech world map + interactive hub network overlay. */
export function InvestorMap({ showHeader = true }: { showHeader?: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeId, setActiveId] = useState('lon')

  const hubsById = useMemo(
    () => Object.fromEntries(INVESTOR_HUBS.map((h) => [h.id, h])) as Record<string, Hub>,
    [],
  )
  const active = hubsById[activeId] ?? INVESTOR_HUBS[0]

  if (!active) return null

  return (
    <RevealOnScroll className="mt-4 w-full min-w-0 sm:mt-6">
      <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#05070A] p-4 sm:p-6">
        {showHeader ? (
          <div className="relative z-[1] mb-4 min-w-0">
            <p className="text-overline text-hl-cyan">Global footprint</p>
            <h3 className="text-heading-md mt-1 break-words text-fg">
              Investors across major financial hubs
            </h3>
          </div>
        ) : null}

        <div className="relative z-[1] mb-4 min-w-0">
          <ul className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {INVESTOR_HUBS.map((hub) => (
              <li key={hub.id} className="snap-start">
                <button
                  type="button"
                  onClick={() => setActiveId(hub.id)}
                  className={cn(
                    'h-11 shrink-0 rounded-full border px-4 text-caption font-medium whitespace-nowrap transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base',
                    activeId === hub.id
                      ? 'border-white/70 bg-white/10 text-fg'
                      : 'border-white/10 bg-white/[0.03] text-fg-muted hover:border-white/25',
                  )}
                >
                  {hub.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-[1] grid min-w-0 gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#030508] sm:aspect-[16/10] lg:aspect-[2/1]">
            <Image
              src="/marketing/tech-world-map.png"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="object-cover object-center opacity-95"
              priority={false}
            />

            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label="World investor network map"
            >
              <defs>
                <linearGradient id="im-arc" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7EB8FF" stopOpacity="0.05" />
                  <stop offset="35%" stopColor="#E8F2FF" stopOpacity="0.9" />
                  <stop offset="65%" stopColor="#9FD0FF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#5A9FE8" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="im-arc-hot" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#C9A45C" stopOpacity="0.12" />
                  <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="100%" stopColor="#7EB8FF" stopOpacity="0.18" />
                </linearGradient>
                <filter id="im-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="2.8" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="im-glow-strong" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {MAP_LINKS.map(([a, b], i) => {
                const from = hubsById[a]
                const to = hubsById[b]
                if (!from || !to) return null
                const hot = a === activeId || b === activeId
                const d = curvePath(from, to)
                return (
                  <g key={`${a}-${b}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke={hot ? 'url(#im-arc-hot)' : 'url(#im-arc)'}
                      strokeWidth={hot ? 2.4 : 1.4}
                      strokeOpacity={hot ? 1 : 0.6}
                      filter={hot ? 'url(#im-glow)' : undefined}
                    />
                    {!prefersReducedMotion ? (
                      <circle
                        r={hot ? 2.8 : 2}
                        fill={hot ? '#FFFFFF' : '#B8D4F0'}
                        filter="url(#im-glow)"
                      >
                        <animateMotion
                          dur={`${3.6 + (i % 4) * 0.7}s`}
                          repeatCount="indefinite"
                          path={d}
                        />
                      </circle>
                    ) : null}
                  </g>
                )
              })}

              {INVESTOR_HUBS.map((hub, i) => {
                const { x, y } = hubPoint(hub)
                const on = activeId === hub.id
                return (
                  <g
                    key={hub.id}
                    className="cursor-pointer"
                    onClick={() => setActiveId(hub.id)}
                    onMouseEnter={() => setActiveId(hub.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActiveId(hub.id)
                      }
                    }}
                    aria-label={`${hub.label}: ${hub.investors} investors`}
                    aria-pressed={on}
                  >
                    <circle cx={x} cy={y} r={26} fill="transparent" />
                    {!prefersReducedMotion ? (
                      <motion.circle
                        cx={x}
                        cy={y}
                        r={on ? 22 : 15}
                        fill={on ? '#E8F2FF' : '#7EB8FF'}
                        animate={{ opacity: [0.45, 0.06, 0.45], scale: [0.8, 1.45, 0.8] }}
                        transition={{
                          duration: 2.4,
                          delay: i * 0.12,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                    ) : null}
                    <circle
                      cx={x}
                      cy={y}
                      r={on ? 7 : 5}
                      fill={on ? '#FFFFFF' : '#D4E8FF'}
                      filter="url(#im-glow-strong)"
                    />
                    <circle cx={x} cy={y} r="2" fill="#FFFFFF" />
                  </g>
                )
              })}
            </svg>
          </div>

          <AnimatePresence mode="wait">
            <motion.aside
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex min-w-0 flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm sm:p-5"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hl-emerald/30 bg-hl-emerald/10 px-2.5 py-1 text-[11px] font-medium text-hl-emerald">
                  <span className="size-1.5 animate-pulse rounded-full bg-hl-emerald" />
                  Active hub
                </span>
                <h4 className="text-heading-md mt-3 text-fg">{active.label}</h4>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                    <dt className="flex items-center gap-1.5 text-caption text-fg-subtle">
                      <Users className="size-3.5" aria-hidden />
                      Investors
                    </dt>
                    <dd className="text-body-sm font-medium tabular-nums text-hl-cyan">
                      {active.investors}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                    <dt className="flex items-center gap-1.5 text-caption text-fg-subtle">
                      <Landmark className="size-3.5" aria-hidden />
                      Capital
                    </dt>
                    <dd className="text-body-sm font-medium tabular-nums text-hl-emerald">
                      {active.aum}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-caption text-fg-subtle">
                      <Activity className="size-3.5" aria-hidden />
                      Today&apos;s activity
                    </dt>
                    <dd className="mt-1 text-body-sm text-fg">{active.activity}</dd>
                  </div>
                </dl>
              </div>
            </motion.aside>
          </AnimatePresence>
        </div>
      </div>
    </RevealOnScroll>
  )
}
