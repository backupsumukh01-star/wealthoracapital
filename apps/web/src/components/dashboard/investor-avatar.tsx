'use client'

import { BadgeCheck } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/cn'

/**
 * Gradient investor avatar with verification badge + online pulse.
 * Sizes map to existing Avatar scale (sm=24, md=40, lg=56).
 */
export function InvestorAvatar({
  firstName,
  lastName,
  src,
  size = 'sm',
  verified = true,
  online = true,
  className,
}: {
  firstName: string
  lastName?: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  verified?: boolean
  online?: boolean
  className?: string
}) {
  const initials = `${firstName.charAt(0)}${(lastName ?? '').charAt(0)}`.toUpperCase() || 'GZ'
  const badge =
    size === 'lg' ? 'size-4' : size === 'md' ? 'size-3.5' : 'size-3'
  const onlineDot =
    size === 'lg' ? 'size-3.5' : size === 'md' ? 'size-3' : 'size-2.5'

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'rounded-full bg-gradient-to-br from-accent-400 via-accent-500 to-hl-cyan p-[1.5px]',
          'shadow-[0_0_16px_-4px_rgba(18,214,160,0.45)]',
        )}
      >
        <Avatar
          size={size}
          className="border-0 bg-raised ring-2 ring-base"
        >
          <AvatarImage src={src ?? undefined} alt="" />
          <AvatarFallback className="bg-gradient-to-br from-accent-500/30 to-hl-cyan/20 font-semibold text-accent-100">
            {initials}
          </AvatarFallback>
        </Avatar>
      </span>

      {verified ? (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full',
            'bg-profit text-accent-foreground ring-2 ring-base',
            badge,
          )}
          aria-label="Verified investor"
        >
          <BadgeCheck className={cn(size === 'sm' ? 'size-2' : 'size-2.5')} strokeWidth={2.5} />
        </span>
      ) : null}

      {online ? (
        <span
          className={cn(
            'absolute -left-0.5 -top-0.5 rounded-full bg-profit ring-2 ring-base',
            onlineDot,
          )}
          aria-label="Online"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-profit/70" aria-hidden />
        </span>
      ) : null}
    </span>
  )
}
