'use client'

import { Check } from 'lucide-react'

import { cn } from '@/lib/cn'

export function StatusTimeline({
  steps,
  activeIndex,
  className,
}: {
  steps: { id: string; label: string }[]
  activeIndex: number
  className?: string
}) {
  return (
    <ol className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const done = index < activeIndex
        const current = index === activeIndex
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  'absolute left-[11px] top-6 h-[calc(100%-12px)] w-px',
                  done ? 'bg-accent-500/50' : 'bg-line',
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 grid size-6 shrink-0 place-items-center rounded-full border text-[10px]',
                done && 'border-accent-500 bg-accent-500/20 text-accent-200',
                current && 'border-accent-400 bg-accent-500/25 text-accent-100 shadow-[0_0_12px_rgba(18,214,160,0.35)]',
                !done && !current && 'border-line bg-inset text-fg-subtle',
              )}
            >
              {done ? <Check className="size-3" aria-hidden /> : index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  'text-body-sm font-medium',
                  current ? 'text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle',
                )}
              >
                {step.label}
              </p>
              {current ? (
                <p className="mt-0.5 text-caption text-accent-300">In progress</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
