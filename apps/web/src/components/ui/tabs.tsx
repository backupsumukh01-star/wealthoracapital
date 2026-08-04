'use client'

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'no-scrollbar inline-flex h-11 w-full max-w-full items-center gap-1 overflow-x-auto overscroll-x-contain rounded-xl',
        'border border-line bg-inset p-1 sm:w-auto',
        className,
      )}
      {...props}
    />
  )
})

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex shrink-0 flex-none items-center justify-center gap-2 whitespace-nowrap rounded-[7px]',
        'px-3 py-1.5 text-caption font-medium text-fg-subtle sm:px-3.5 sm:text-body-sm',
        'transition-colors duration-[160ms] ease-out-soft',
        'hover:text-fg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-raised data-[state=active]:text-fg data-[state=active]:shadow-e1',
        '[&_svg]:size-4 sm:[&_svg]:size-5',
        className,
      )}
      {...props}
    />
  )
})

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[state=active]:animate-fade-in',
        className,
      )}
      {...props}
    />
  )
})
