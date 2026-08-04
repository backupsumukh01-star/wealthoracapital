import type { ReactNode } from 'react'

import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { cn } from '@/lib/cn'

export interface SectionProps {
  children: ReactNode
  /** Short uppercase kicker above the heading. */
  eyebrow?: string
  title?: ReactNode
  description?: ReactNode
  /** Centres the heading block. Used for the mid-page sections; the hero stays left-aligned. */
  centered?: boolean
  id?: string
  /** Adds the faint technical grid or the accent glow behind the section. */
  backdrop?: 'none' | 'grid' | 'glow'
  className?: string
  containerClassName?: string
}

/**
 * The vertical rhythm of every marketing section, expressed once: 80px of block padding on
 * mobile and 128px from `lg`, inside the shared page container.
 *
 * Sections are the unit that makes long pages feel composed rather than assembled, so the
 * spacing lives here instead of being retyped per page (docs/10 §4).
 */
export function Section({
  children,
  eyebrow,
  title,
  description,
  centered = false,
  id,
  backdrop = 'none',
  className,
  containerClassName,
}: SectionProps) {
  const hasHeading = Boolean(eyebrow || title || description)

  return (
    <section
      id={id}
      className={cn(
        'section-y relative isolate min-w-0 overflow-x-clip',
        backdrop === 'grid' && 'bg-grid',
        backdrop === 'glow' && 'bg-radial-accent',
        className,
      )}
    >
      <div className={cn('container-page min-w-0', containerClassName)}>
        {hasHeading ? (
          <RevealOnScroll
            className={cn(
              'mb-6 flex flex-col gap-2.5 sm:mb-10 sm:gap-3.5 lg:mb-12',
              centered && 'items-center text-center',
            )}
          >
            {eyebrow ? <span className="text-overline text-accent-300">{eyebrow}</span> : null}
            {title ? (
              <h2 className="text-display-md max-w-3xl break-words text-fg">{title}</h2>
            ) : null}
            {description ? (
              <p
                className={cn(
                  'prose-measure text-body-md text-fg-muted sm:text-body-lg',
                  centered && 'mx-auto',
                )}
              >
                {description}
              </p>
            ) : null}
          </RevealOnScroll>
        ) : null}

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}
