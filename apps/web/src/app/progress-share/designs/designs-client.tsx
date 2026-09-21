'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { SAMPLE_DAILY, SAMPLE_OVERALL } from '@/components/progress-share/prototype/sample-data'
import {
  ProgressSharePrototypeCanvas,
  PROTOTYPE_CANVAS,
} from '@/components/progress-share/prototype/share-canvas'
import type { ProgressShareKind } from '@/components/progress-share/prototype/types'

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
      className="w-full overflow-hidden rounded-[28px] shadow-[0_40px_120px_rgb(0_0_0/0.55)]"
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
  const [kind, setKind] = useState<ProgressShareKind>('overall')
  const data = kind === 'overall' ? SAMPLE_OVERALL : SAMPLE_DAILY

  return (
    <main className="min-h-dvh bg-[#05070A] text-[#F2F4F7]">
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A45C]">
          Design lab — photo templates
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Share posters</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#AAB3BD] sm:text-base">
          The attached artwork is the canvas. Only investor name and USD figures are drawn on top.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ['overall', 'Investment Journey'],
              ['daily', "Today's Earnings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium',
                kind === id
                  ? 'border-[#3CCB91] bg-[#3CCB91]/15 text-[#3CCB91]'
                  : 'border-white/10 text-[#AAB3BD]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-[440px]">
          <ScaledPoster key={kind}>
            <ProgressSharePrototypeCanvas data={data} />
          </ScaledPoster>
        </div>
      </div>
    </main>
  )
}
