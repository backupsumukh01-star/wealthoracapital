import type { ReactNode } from 'react'
import Link from 'next/link'

import { SITE } from '@/lib/constants'
import { cn } from '@/lib/cn'

import { LogoMark, type LogoTone } from './logo-mark'

export type LogoVariant = 'horizontal' | 'stacked' | 'mark' | 'wordmark'

export interface LogoProps {
  variant?: LogoVariant
  tone?: LogoTone
  /** @deprecated use variant="mark" */
  markOnly?: boolean
  href?: string | null
  className?: string
  markClassName?: string
}

/** Wealthora logo — horizontal (default), stacked, mark-only, or wordmark. */
export function Logo({
  variant = 'horizontal',
  tone = 'color',
  markOnly = false,
  href = '/',
  className,
  markClassName,
}: LogoProps) {
  const resolved: LogoVariant = markOnly ? 'mark' : variant

  const mark = (
    <LogoMark
      tone={tone}
      className={cn(resolved === 'stacked' ? 'size-10' : 'size-8', markClassName)}
    />
  )

  const word = (
    <span
      className={cn(
        'font-semibold tracking-tight',
        resolved === 'stacked' ? 'text-[1.35rem]' : 'text-[1.125rem]',
        tone === 'mono' && 'text-current',
        tone === 'light' && 'text-white',
        tone === 'dark' && 'text-[#07090B]',
        tone === 'color' && 'text-fg',
      )}
    >
      <span className="bg-gradient-to-r from-[#C4CBD3] via-[#D4D9DF] to-[#F2F4F7] bg-clip-text text-transparent">
        {SITE.wordmark.primary}
      </span>
    </span>
  )

  let content: ReactNode
  if (resolved === 'mark') {
    content = mark
  } else if (resolved === 'wordmark') {
    content = word
  } else if (resolved === 'stacked') {
    content = (
      <span className="inline-flex flex-col items-center gap-2">
        {mark}
        {word}
      </span>
    )
  } else {
    content = (
      <span className="inline-flex items-center gap-3">
        {mark}
        {word}
      </span>
    )
  }

  const wrapped = (
    <span className={cn('inline-flex items-center', className)}>{content}</span>
  )

  if (!href) return wrapped

  return (
    <Link
      href={href}
      aria-label={`${SITE.name} — home`}
      className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
    >
      {wrapped}
    </Link>
  )
}

export { LogoMark }
export type { LogoTone }
