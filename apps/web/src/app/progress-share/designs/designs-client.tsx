'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { SAMPLE_DAILY } from '@/components/progress-share/prototype/sample-data'
import { DAILY_SLOTS } from '@/components/progress-share/prototype/overlay-layout'
import {
  ProgressSharePrototypeCanvas,
  PROTOTYPE_CANVAS,
} from '@/components/progress-share/prototype/share-canvas'

function ScaledPoster({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(420)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = width / PROTOTYPE_CANVAS.width
  return (
    <div
      ref={hostRef}
      className="w-full overflow-hidden rounded-[28px] shadow-[0_40px_120px_-20px_rgb(0_0_0/0.55)]"
    >
      <div className="relative bg-black" style={{ height: PROTOTYPE_CANVAS.height * scale }}>
        <div
          className="absolute left-0 top-0"
          style={{
            width: PROTOTYPE_CANVAS.width,
            height: PROTOTYPE_CANVAS.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function ProgressShareDesignsClient() {
  const [poster, setPoster] = useState<'a' | 'b'>('a')
  const [guides, setGuides] = useState(false)

  return (
    <main className="min-h-dvh bg-[#05070A] text-[#F2F4F7]">
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A45C]">
          Design lab — HD preview
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Share posters</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#AAB3BD] sm:text-base">
          Both photos are 1080×1920. Change pixel x/y, size and colour in{' '}
          <code className="text-[#C9A45C]">overlay-layout.ts</code>, then refresh. Red dashed boxes are
          guides only — they do not appear on downloaded PNGs.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ['a', 'Poster A'],
              ['b', 'Poster B'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPoster(id)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium',
                poster === id
                  ? 'border-[#3CCB91] bg-[#3CCB91]/15 text-[#3CCB91]'
                  : 'border-white/10 text-[#AAB3BD]',
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setGuides((v) => !v)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium',
              guides ? 'border-[#FF8A8A] bg-[#FF8A8A]/10 text-[#FF8A8A]' : 'border-white/10 text-[#AAB3BD]',
            )}
          >
            {guides ? 'Hide pixel guides' : 'Show pixel guides'}
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-[440px]">
          <ScaledPoster
            key={`${poster}-${DAILY_SLOTS.totalEarnings.x}-${DAILY_SLOTS.totalEarnings.y}-${DAILY_SLOTS.date.x}`}
          >
            <ProgressSharePrototypeCanvas data={SAMPLE_DAILY} poster={poster} showGuides={guides} />
          </ScaledPoster>
        </div>
      </div>
    </main>
  )
}
