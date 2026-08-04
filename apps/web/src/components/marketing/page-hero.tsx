import type { ReactNode } from 'react'

import { FadeIn } from '@/components/motion/fade-in'
import { cn } from '@/lib/cn'

/** The shared masthead for every inner marketing page, so they share one vertical rhythm. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('relative isolate overflow-hidden pb-12 pt-8 lg:pb-16 lg:pt-12', className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-radial-accent" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-25" />

      <div className="container-page">
        <FadeIn className="max-w-3xl space-y-5">
          {eyebrow ? <span className="text-overline text-accent-300">{eyebrow}</span> : null}
          <h1 className="text-display-lg text-fg">{title}</h1>
          {description ? <p className="text-body-lg text-fg-muted">{description}</p> : null}
          {children}
        </FadeIn>
      </div>
    </section>
  )
}
