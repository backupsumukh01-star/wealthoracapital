'use client'

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'

import { cn } from '@/lib/cn'

export const Accordion = AccordionPrimitive.Root

export const AccordionItem = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn('border-b border-line last:border-b-0', className)}
      {...props}
    />
  )
})

export const AccordionTrigger = forwardRef<
  ElementRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          'group flex flex-1 items-start justify-between gap-6 py-5 text-left',
          'text-body-lg font-medium text-fg transition-colors duration-[160ms]',
          'hover:text-accent-200 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring',
          className,
        )}
        {...props}
      >
        {children}
        <Plus
          className={cn(
            'mt-1 size-5 shrink-0 text-fg-subtle transition-transform duration-[240ms]',
            'ease-out-soft group-data-[state=open]:rotate-45 group-data-[state=open]:text-accent',
          )}
          aria-hidden
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
})

export const AccordionContent = forwardRef<
  ElementRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        'overflow-hidden',
        'data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up',
      )}
      {...props}
    >
      <div className={cn('prose-measure pb-6 pr-10 text-body-md text-fg-muted', className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
})
