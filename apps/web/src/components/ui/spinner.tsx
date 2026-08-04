import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/cn'

const sizes = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-8',
} as const

export function Spinner({
  size = 'md',
  className,
  label = 'Loading',
}: {
  size?: keyof typeof sizes
  className?: string
  label?: string
}) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center', className)}>
      <Loader2 className={cn('animate-spin text-fg-subtle', sizes[size])} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}
