import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/cn'

/**
 * Depth comes from stepped surfaces, not from stacking shadows. A resting card sits at
 * elevation 1; only `interactive` cards lift on hover, because a page where everything
 * floats reads as noise.
 */
const cardVariants = cva('border transition-all duration-[160ms] ease-out-soft', {
  variants: {
    variant: {
      default: 'rounded-xl border-line bg-raised shadow-e1',
      glass: 'glass glass-edge rounded-2xl shadow-e2',
      inset: 'rounded-xl border-line bg-inset',
      ghost: 'rounded-xl border-transparent bg-transparent',
      accent: 'rounded-2xl border-accent-800 bg-raised shadow-glow',
      luxury: 'panel-luxury',
      'gradient-accent': 'panel-gradient-accent border-0',
    },
    interactive: {
      true: 'hover:-translate-y-1 hover:border-line-strong hover:shadow-e3',
    },
    padded: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-6 md:p-8',
      xl: 'p-7 md:p-10',
    },
  },
  defaultVariants: { variant: 'default', padded: 'none' },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, interactive, padded, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive, padded }), className)}
      {...props}
    />
  )
})

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  },
)

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return <h3 ref={ref} className={cn('text-heading-sm text-fg', className)} {...props} />
  },
)

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('text-body-sm text-fg-muted', className)} {...props} />
  },
)

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  },
)

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3 border-t border-line px-6 py-4', className)}
        {...props}
      />
    )
  },
)
