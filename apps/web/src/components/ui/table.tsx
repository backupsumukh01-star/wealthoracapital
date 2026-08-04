import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * Low-level table parts. Feature tables compose `<DataTable>` on top of these; this file only
 * owns the styling and the sticky-header mechanics.
 *
 * Financial data never scrolls horizontally on mobile — below `md` the consuming component
 * renders cards instead. See `<DataTable>`.
 */

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return (
      <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table
          ref={ref}
          className={cn('w-full min-w-0 caption-bottom border-collapse text-body-sm', className)}
          {...props}
        />
      </div>
    )
  },
)

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return (
    <thead
      ref={ref}
      className={cn('sticky top-0 z-10 bg-raised/95 backdrop-blur-sm', className)}
      {...props}
    />
  )
})

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
})

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableFooter({ className, ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      className={cn('border-t border-line bg-inset font-medium', className)}
      {...props}
    />
  )
})

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  function TableRow({ className, ...props }, ref) {
    return (
      <tr
        ref={ref}
        className={cn(
          'border-b border-line transition-colors duration-[100ms]',
          'hover:bg-hover/50 data-[state=selected]:bg-hover',
          className,
        )}
        {...props}
      />
    )
  },
)

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(function TableHead({ className, numeric, ...props }, ref) {
  return (
    <th
      ref={ref}
      scope="col"
      data-numeric={numeric || undefined}
      className={cn(
        'h-11 whitespace-nowrap border-b border-line px-4 text-left align-middle',
        'text-overline text-fg-subtle',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  )
})

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(function TableCell({ className, numeric, ...props }, ref) {
  return (
    <td
      ref={ref}
      data-numeric={numeric || undefined}
      className={cn(
        'px-4 py-3.5 align-middle text-fg-muted',
        numeric && 'text-right text-fg',
        className,
      )}
      {...props}
    />
  )
})

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(function TableCaption({ className, ...props }, ref) {
  return <caption ref={ref} className={cn('mt-4 text-caption text-fg-subtle', className)} {...props} />
})
