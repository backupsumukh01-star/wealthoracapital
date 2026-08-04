'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/cn'

/**
 * The accent fill marks the primary action and nothing else. If it appears three times on a
 * screen it stops meaning anything, so most buttons on any given view are `secondary` or `ghost`.
 */
const buttonVariants = cva(
  [
    'relative inline-flex max-w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium',
    'select-none rounded-xl outline-none touch-manipulation',
    'transition-[background-color,border-color,color,box-shadow,transform]',
    'duration-[160ms] ease-out-soft',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'focus-visible:ring-offset-base',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.985]',
    'hover:scale-[1.015]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    '[&_svg]:transition-transform [&_svg]:duration-[160ms]',
    'hover:[&_svg]:translate-x-0.5',
    // Soft ripple on press
    'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 after:transition-opacity after:duration-300',
    'after:bg-[radial-gradient(circle_at_var(--ripple-x,50%)_var(--ripple-y,50%),rgb(255_255_255/0.28),transparent_52%)]',
    'active:after:opacity-100',
    // Ambient sheen
    'before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent before:opacity-70',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-foreground shadow-glow hover:bg-accent-400 hover:shadow-glow-soft active:shadow-glow',
        secondary:
          'border border-line-default bg-raised text-fg shadow-e1 hover:border-line-strong hover:bg-hover hover:-translate-y-px hover:shadow-e2',
        ghost: 'text-fg-muted before:opacity-0 hover:bg-hover hover:text-fg hover:scale-100 hover:[&_svg]:translate-x-0',
        glass:
          'glass glass-edge text-fg shadow-e1 hover:border-line-strong hover:bg-hover/60 hover:-translate-y-px hover:shadow-e2',
        danger: 'bg-danger text-white shadow-e2 hover:brightness-110 focus-visible:ring-danger',
        outline: 'border border-line-strong bg-transparent text-fg hover:bg-hover',
        link: 'h-auto rounded-md px-0 py-0 text-accent-300 before:hidden underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        sm: 'h-10 min-h-10 px-3.5 text-sm [&_svg]:size-[18px]',
        md: 'h-[52px] min-h-[52px] px-5 text-sm [&_svg]:size-[18px]',
        lg: 'h-14 min-h-14 px-6 text-[15px] [&_svg]:size-5',
        icon: 'size-11 p-0 [&_svg]:size-5',
        'icon-sm': 'size-10 p-0 [&_svg]:size-5',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  /** Announced while `loading` is true, so the state is not conveyed by the spinner alone. */
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    fullWidth,
    asChild = false,
    loading = false,
    loadingText,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
})

export { buttonVariants }
