'use client'

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
  const my = Math.min(p1.y, p2.y) - 32 - Math.abs(p1.x - p2.x) * 0.05
  return `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`
}

/** Premium interactive global footprint. */
export function InvestorMap({ showHeader = true }: { showHeader?: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeId, setActiveId] = useState('lon')

  const hubsById = useMemo(
    () => Object.fromEntries(INVESTOR_HUBS.map((h) => [h.id, h])) as Record<string, Hub>,
    [],
  )
  const active = hubsById[activeId] ?? INVESTOR_HUBS[0]!

  return (
    <RevealOnScroll className="mt-4 w-full min-w-0 sm:mt-6">
      <div className="card-fill relative w-full min-w-0 overflow-hidden p-4 sm:p-6">
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
                    'h-12 shrink-0 rounded-full border px-4 text-caption font-medium whitespace-nowrap transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base',
                    activeId === hub.id
                      ? 'border-accent-500 bg-accent-500/15 text-accent-200'
                      : 'border-line bg-inset/50 text-fg-muted',
                  )}
                >
                  {hub.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-[1] grid min-w-0 gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-[#061018] sm:aspect-[16/10] lg:aspect-[2/1]">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-full w-full"
              role="img"
              aria-label="World investor map"
            >
              <defs>
                <radialGradient id="ocean" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="#0d2833" />
                  <stop offset="100%" stopColor="#061018" />
                </radialGradient>
                <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1a4a52" />
                  <stop offset="100%" stopColor="#123840" />
                </linearGradient>
                <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2AE8FF" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#12D6A0" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#5EF2C4" stopOpacity="0.25" />
                </linearGradient>
                <filter id="pulse" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width={W} height={H} fill="url(#ocean)" />

              <g fill="url(#land)" stroke="#2AE8FF" strokeOpacity="0.2" strokeWidth="1">
                <path d="M70 130 C140 85 210 95 270 140 C320 185 300 250 240 270 C170 290 90 240 70 180 Z" />
                <path d="M200 275 C245 268 275 320 255 375 C235 430 185 455 150 420 C115 385 150 295 200 275 Z" />
                <path d="M420 115 C475 90 530 100 560 140 C590 180 575 230 530 245 C480 265 430 220 420 165 Z" />
                <path d="M470 235 C520 225 555 275 545 335 C535 400 485 445 445 420 C405 395 430 280 470 235 Z" />
                <path d="M560 125 C660 85 780 105 860 170 C930 230 945 310 890 355 C830 400 720 390 640 350 C560 310 540 210 560 125 Z" />
                <path d="M820 340 C880 325 940 360 950 405 C960 445 910 470 855 455 C800 440 790 375 820 340 Z" />
              </g>

              {MAP_LINKS.map(([a, b], i) => {
                const from = hubsById[a]
                const to = hubsById[b]
                if (!from || !to) return null
                const hot = a === activeId || b === activeId
                return (
                  <g key={`${a}-${b}`}>
                    <path
                      d={curvePath(from, to)}
                      fill="none"
                      stroke="url(#arc)"
                      strokeWidth={hot ? 2.4 : 1.15}
                      strokeOpacity={hot ? 1 : 0.4}
                    />
                    {!prefersReducedMotion ? (
                      <circle r={hot ? 3 : 2} fill="#5EF2C4" filter="url(#pulse)">
                        <animateMotion
                          dur={`${4 + (i % 3)}s`}
                          repeatCount="indefinite"
                          path={curvePath(from, to)}
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
                    <circle cx={x} cy={y} r={24} fill="transparent" />
                    {!prefersReducedMotion ? (
                      <motion.circle
                        cx={x}
                        cy={y}
                        r={on ? 20 : 14}
                        fill="#12D6A0"
                        animate={{ opacity: [0.4, 0.05, 0.4], scale: [0.85, 1.4, 0.85] }}
                        transition={{
                          duration: 2.2,
                          delay: i * 0.1,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                    ) : null}
                    <circle
                      cx={x}
                      cy={y}
                      r={on ? 6 : 4.5}
                      fill={on ? '#5EF2C4' : '#12D6A0'}
                      filter="url(#pulse)"
                    />
                    <circle cx={x} cy={y} r="1.6" fill="#fff" />
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
              className="card-fill flex min-w-0 flex-col justify-between p-4 sm:p-5"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hl-emerald/30 bg-hl-emerald/10 px-2.5 py-1 text-[11px] font-medium text-hl-emerald">
                  <span className="size-1.5 animate-pulse rounded-full bg-hl-emerald" />
                  Active hub
                </span>
                <h4 className="text-heading-md mt-3 text-fg">{active.label}</h4>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                    <dt className="flex items-center gap-1.5 text-caption text-fg-subtle">
                      <Users className="size-3.5" aria-hidden />
                      Investors
                    </dt>
                    <dd className="text-body-sm font-medium tabular-nums text-hl-cyan">
                      {active.investors}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
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
