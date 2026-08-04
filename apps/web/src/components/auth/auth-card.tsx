'use client'

import type { ReactNode } from 'react'

import { FadeIn } from '@/components/motion/fade-in'
import { cn } from '@/lib/cn'

/**
 * Glass shell for every auth screen — matches landing glass treatment.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <FadeIn
      className={cn(
        'glass glass-edge min-w-0 space-y-5 rounded-2xl p-4 shadow-e4 sm:space-y-7 sm:p-8',
        className,
      )}
    >
      <header className="space-y-2">
        <h1 className="text-heading-xl text-fg sm:text-display-md sm:leading-tight">{title}</h1>
        {description ? <p className="text-body-sm text-fg-muted sm:text-body-md">{description}</p> : null}
      </header>

      {children}

      {footer ? <div className="text-body-sm text-center text-fg-muted">{footer}</div> : null}
    </FadeIn>
  )
}
