'use client'

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/cn'

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close

const sheetVariants = cva(
  [
    'fixed z-50 flex flex-col glass-strong shadow-e4',
    'transition-transform duration-[280ms] ease-out-soft',
  ],
  {
    variants: {
      side: {
        left: 'inset-y-0 left-0 h-full w-[min(86vw,24rem)] max-w-sm border-r border-glass-line data-[state=closed]:-translate-x-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        right:
          'inset-y-0 right-0 h-full w-[min(86vw,24rem)] max-w-sm border-l border-glass-line data-[state=closed]:translate-x-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        bottom:
          'inset-x-0 bottom-0 max-h-[min(85vh,85dvh)] rounded-t-2xl border-t border-glass-line data-[state=closed]:translate-y-full pb-[env(safe-area-inset-bottom)]',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

export const SheetContent = forwardRef<
  ElementRef<typeof SheetPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & VariantProps<typeof sheetVariants>
>(function SheetContent({ className, side, children, ...props }, ref) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in"
      />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            'absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-md text-fg-subtle',
            'transition-colors hover:bg-hover hover:text-fg',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          )}
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
})

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 border-b border-line px-4 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-14', className)}
      {...props}
    />
  )
}

export function SheetBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5', className)} {...props} />
}

export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 border-t border-line px-4 py-4 sm:flex-row sm:px-6',
        className,
      )}
      {...props}
    />
  )
}

export const SheetTitle = forwardRef<
  ElementRef<typeof SheetPrimitive.Title>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Title ref={ref} className={cn('text-heading-md text-fg', className)} {...props} />
  )
})

export const SheetDescription = forwardRef<
  ElementRef<typeof SheetPrimitive.Description>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Description
      ref={ref}
      className={cn('text-body-sm text-fg-muted', className)}
      {...props}
    />
  )
})
