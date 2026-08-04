'use client'

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/cn'

export const Progress = forwardRef<
  ElementRef<typeof ProgressPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { tone?: 'accent' | 'profit' }
>(function Progress({ className, value = 0, tone = 'accent', ...props }, ref) {
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-inset', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'size-full flex-1 rounded-full transition-transform duration-[360ms] ease-out-soft',
          tone === 'profit' ? 'bg-profit' : 'bg-accent',
        )}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
